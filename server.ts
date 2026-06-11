import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Define structures in this file or import from types
interface FileItem {
  path: string;
  content: string; // text content or base64
  isBinary: boolean;
}

const app = express();
const PORT = 3000;

// Increase payload sizes to support files and folder uploads
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// In-memory session store for web layouts
const sessions = new Map<string, FileItem[]>();

// 1. Sync files to the session for interactive live preview
app.post('/api/preview/sync', (req: Request, res: Response): void => {
  const { sessionId, files } = req.body;
  if (!sessionId || !Array.isArray(files)) {
    res.status(400).json({ error: 'Missing sessionId or files' });
    return;
  }
  
  // Save or update files for this session
  sessions.set(sessionId, files);
  res.json({ success: true, count: files.length });
});

// Helper to determine fine-grained MIME types
function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif': return 'image/gif';
    case '.svg': return 'image/svg+xml';
    case '.webp': return 'image/webp';
    case '.ico': return 'image/x-icon';
    case '.mp3': return 'audio/mpeg';
    case '.mp4': return 'video/mp4';
    case '.webm': return 'video/webm';
    case '.pdf': return 'application/pdf';
    case '.txt': return 'text/plain; charset=utf-8';
    case '.md': return 'text/markdown; charset=utf-8';
    default: return 'application/octet-stream';
  }
}

// Redirect any request to /api/preview/:sessionId (no trailing slash) to /api/preview/:sessionId/
app.get('/api/preview/:sessionId', (req: Request, res: Response): void => {
  res.redirect(`/api/preview/${req.params.sessionId}/`);
});

// 2. Serve the preview of the static files in the given session ID
app.get('/api/preview/:sessionId/*', (req: Request, res: Response): void => {
  const { sessionId } = req.params;
  let requestedPath = req.params[0] || 'index.html';

  // Normalize path
  if (requestedPath === '/' || requestedPath === '') {
    requestedPath = 'index.html';
  }
  // Trim leading/trailing slashes
  requestedPath = requestedPath.replace(/^\//, '');

  const sessionFiles = sessions.get(sessionId);
  if (!sessionFiles) {
    res.status(404).send('Session not found or expired. Please upload or modify files again.');
    return;
  }

  // Find exact match or index.html in a subdirectory if asked
  let targetFile = sessionFiles.find(
    (f) => f.path === requestedPath || f.path === `/${requestedPath}`
  );

  // If path is a folder, try to find index.html within that directory
  if (!targetFile && (requestedPath === '' || sessionFiles.some(f => f.path.startsWith(requestedPath + '/')))) {
    const indexPath = requestedPath ? `${requestedPath}/index.html` : 'index.html';
    targetFile = sessionFiles.find(
      (f) => f.path === indexPath || f.path === `/${indexPath}`
    );
  }

  // Adaptive viewport fallback: if requested file is missing and the path points to index.html,
  // locate any available .html page inside the directory tree so we don't display a blank error screen.
  if (!targetFile && (requestedPath === 'index.html' || requestedPath === '')) {
    targetFile = sessionFiles.find(f => f.path.endsWith('.html'));
  }

  if (!targetFile) {
    // If not found, log what's requested and return 404
    console.log(`404 NOT FOUND: "${requestedPath}" in session ${sessionId}. Available files:`, sessionFiles.map(f => f.path));
    res.status(404).send(`File not found: "${requestedPath}". Make sure it is present in your uploaded structure.`);
    return;
  }

  const mimeType = getMimeType(targetFile.path);
  res.setHeader('Content-Type', mimeType);
  
  // Set relaxed frame permissions so preview can render correctly but securely
  res.setHeader('X-Frame-Options', 'ALLOWALL'); 
  res.setHeader('Content-Security-Policy', "frame-ancestors *;");

  if (targetFile.isBinary) {
    const buffer = Buffer.from(targetFile.content, 'base64');
    res.send(buffer);
  } else {
    let textContent = targetFile.content;
    
    // Auto-fix root-relative paths for HTML documents so that resources (e.g., href="/styles.css")
    // are correctly mapped inside the active dynamic preview context rather than standard root domains.
    if (mimeType.includes('text/html')) {
      const previewPrefix = `/api/preview/${sessionId}/`;
      textContent = textContent.replace(/(src|href)=["']\/([^/][^"']*)["']/g, (match, attr, path) => {
        return `${attr}="${previewPrefix}${path}"`;
      });

      // Inject standard logging and frame communication hooks
      const debugScript = `
<script id="telemetry-injected-guard">
  (function() {
    const origLog = console.log;
    const origError = console.error;
    const origWarn = console.warn;
    const origInfo = console.info;

    function report(type, args) {
      try {
        const text = Array.from(args).map(arg => {
          if (arg === null) return 'null';
          if (arg === undefined) return 'undefined';
          if (typeof arg === 'object') {
            try { return JSON.stringify(arg); } catch(e) { return String(arg); }
          }
          return String(arg);
        }).join(' ');

        window.parent.postMessage({
          source: 'preview-iframe-console',
          type: type,
          message: text
        }, '*');
      } catch (e) {}
    }

    console.log = function() { report('log', arguments); origLog.apply(console, arguments); };
    console.error = function() { report('error', arguments); origError.apply(console, arguments); };
    console.warn = function() { report('info', arguments); origWarn.apply(console, arguments); };
    console.info = function() { report('info', arguments); origInfo.apply(console, arguments); };

    window.addEventListener('error', function(e) {
      report('error', [e.message + ' (' + (e.filename ? e.filename.split('/').pop() : 'inline') + ':' + e.lineno + ')']);
    });

    window.addEventListener('unhandledrejection', function(e) {
      report('error', ['Unhandled Promise Rejection: ' + e.reason]);
    });

    document.addEventListener('DOMContentLoaded', function() {
      report('info', 'Active document loaded and running successfully.');
    });
  })();
</script>
`;
      if (textContent.includes('</body>')) {
        textContent = textContent.replace('</body>', `${debugScript}\n</body>`);
      } else {
        textContent = textContent + debugScript;
      }
    } else if (mimeType.includes('text/css')) {
      const previewPrefix = `/api/preview/${sessionId}/`;
      textContent = textContent.replace(/url\(['"]?\/([^/][^'")]*)['"]?\)/g, (match, path) => {
        return `url('${previewPrefix}${path}')`;
      });
    }

    res.send(textContent);
  }
});

// 3. GitHub direct API deployment
app.post('/api/github/deploy', async (req: Request, res: Response): Promise<void> => {
  const { token, repoName, description, files, isPrivate } = req.body;

  if (!token) {
    res.status(400).json({ error: 'GitHub access token is required' });
    return;
  }
  if (!repoName) {
    res.status(400).json({ error: 'Repository name is required' });
    return;
  }
  if (!Array.isArray(files) || files.length === 0) {
    res.status(400).json({ error: 'No files to deploy' });
    return;
  }

  const ghHeaders = {
    'Authorization': `token ${token}`,
    'Accept': 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'Web-Deployer-Express'
  };

  try {
    // A. Get User Profile to get login Name
    console.log('GitHub Deploy: Fetching user profile...');
    const userRes = await fetch('https://api.github.com/user', { headers: ghHeaders });
    if (!userRes.ok) {
      const errText = await userRes.text();
      res.status(userRes.status).json({ error: `GitHub Auth failed: ${errText || userRes.statusText}` });
      return;
    }
    const userData = await userRes.json() as { login: string };
    const username = userData.login;
    console.log(`GitHub Deploy: authenticated as username "${username}"`);

    // B. Check if Repo Exists. If not, create it.
    let repoData: any;
    console.log(`GitHub Deploy: checking or creating repository "${username}/${repoName}"...`);
    const createRepoRes = await fetch('https://api.github.com/user/repos', {
      method: 'POST',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: repoName,
        description: description || 'Deployed dynamically via Web Deployer System',
        private: !!isPrivate,
        auto_init: false
      })
    });

    if (createRepoRes.status === 201) {
      repoData = await createRepoRes.json();
      console.log('GitHub Deploy: repository created successfully!');
    } else if (createRepoRes.status === 422) {
      // 422 means repository already exists - fetch it instead
      console.log('GitHub Deploy: repository already exists, obtaining details...');
      const checkRepoRes = await fetch(`https://api.github.com/repos/${username}/${repoName}`, { headers: ghHeaders });
      if (!checkRepoRes.ok) {
        throw new Error(`Failed to fetch existing repository details: ${checkRepoRes.statusText}`);
      }
      repoData = await checkRepoRes.json();
    } else {
      const errText = await createRepoRes.text();
      throw new Error(`Failed to handle repository status: ${createRepoRes.status} ${errText}`);
    }

    // C. Get branch reference of main or master
    let parentSha = '';
    console.log('GitHub Deploy: checking for existing master/main branch reference...');
    
    // Check main branch
    let refRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/ref/heads/main`, { headers: ghHeaders });
    let branchName = 'main';
    
    if (!refRes.ok) {
      // try master
      refRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/ref/heads/master`, { headers: ghHeaders });
      if (refRes.ok) {
        branchName = 'master';
      }
    }

    if (refRes.ok) {
      const refData = await refRes.json() as { object: { sha: string } };
      parentSha = refData.object.sha;
      console.log(`GitHub Deploy: found existing HEAD commit SHA [${parentSha}] on branch "${branchName}"`);
    } else {
      // Brand new repository, let's initialize main branch by creating index.html or README.md via contents API
      console.log('GitHub Deploy: Brand new repository! Initializing main branch with a README.md file...');
      const initReadmeContent = Buffer.from(`# ${repoName}\n\nDeployed dynamically via Web Deployer System!\n\nLive Preview (if GitHub Pages is active): https://${username}.github.io/${repoName}/`).toString('base64');
      
      const initRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/contents/README.md`, {
        method: 'PUT',
        headers: { ...ghHeaders, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: 'Initial commit (Created README.md)',
          content: initReadmeContent
        })
      });

      if (!initRes.ok) {
        const errText = await initRes.text();
        throw new Error(`Initialization failed: ${initRes.status} ${errText}`);
      }

      const initData = await initRes.json() as { commit: { sha: string } };
      parentSha = initData.commit.sha;
      branchName = 'main';
      console.log(`GitHub Deploy: repository successfully initialized with initial commit SHA [${parentSha}]`);
    }

    // D. Fetch the base tree SHA
    console.log(`GitHub Deploy: Reading commit object [${parentSha}] to identify base tree...`);
    const commitRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/commits/${parentSha}`, { headers: ghHeaders });
    if (!commitRes.ok) {
      throw new Error(`Failed to fetch parent commit: ${commitRes.statusText}`);
    }
    const commitData = await commitRes.json() as { tree: { sha: string } };
    const baseTreeSha = commitData.tree.sha;
    console.log(`GitHub Deploy: base tree SHA is [${baseTreeSha}]`);

    // E. Create Blobs for binary files, and plan tree items
    const blobShasMap: Record<string, string> = {};
    const binaryFiles = files.filter(f => f.isBinary);
    
    if (binaryFiles.length > 0) {
      console.log(`GitHub Deploy: Creating binary blobs for ${binaryFiles.length} file(s)...`);
      for (const bFile of binaryFiles) {
        const blobRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/blobs`, {
          method: 'POST',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            content: bFile.content,
            encoding: 'base64'
          })
        });

        if (!blobRes.ok) {
          throw new Error(`Failed to create blob for "${bFile.path}": ${blobRes.statusText}`);
        }
        const blobData = await blobRes.json() as { sha: string };
        blobShasMap[bFile.path] = blobData.sha;
      }
    }

    // F. Create Git tree
    console.log('GitHub Deploy: Building and pushing git tree structure...');
    const treeItems = files.map(file => {
      if (file.isBinary) {
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          sha: blobShasMap[file.path]
        };
      } else {
        return {
          path: file.path,
          mode: '100644',
          type: 'blob',
          content: file.content
        };
      }
    });

    const createTreeRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/trees`, {
      method: 'POST',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        base_tree: baseTreeSha,
        tree: treeItems
      })
    });

    if (!createTreeRes.ok) {
      const errText = await createTreeRes.text();
      throw new Error(`Failed to create git tree structure: ${createTreeRes.status} ${errText}`);
    }
    const treeData = await createTreeRes.json() as { sha: string };
    const newTreeSha = treeData.sha;
    console.log(`GitHub Deploy: created new tree SHA [${newTreeSha}] successfully`);

    // G. Create committing object
    console.log('GitHub Deploy: Injecting commit reference...');
    const createCommitRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/commits`, {
      method: 'POST',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: 'Deploy updated web layout via in-browser dynamic deployer',
        tree: newTreeSha,
        parents: [parentSha]
      })
    });

    if (!createCommitRes.ok) {
      throw new Error(`Failed to create database commit: ${createCommitRes.statusText}`);
    }
    const newCommitData = await createCommitRes.json() as { sha: string };
    const newCommitSha = newCommitData.sha;
    console.log(`GitHub Deploy: generated commit reference SHA [${newCommitSha}]`);

    // H. Move current HEAD to the new commit
    console.log(`GitHub Deploy: Fast-forwarding branch refs/heads/${branchName} to target commit...`);
    const updateRefRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/git/refs/heads/${branchName}`, {
      method: 'PATCH',
      headers: { ...ghHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sha: newCommitSha,
        force: true
      })
    });

    if (!updateRefRes.ok) {
      throw new Error(`Failed to update head reference path: ${updateRefRes.statusText}`);
    }
    console.log('GitHub Deploy: Commit successfully pushed and head pointer updated!');

    // I. Attempt triggering GitHub Pages
    let pagesUrl = `https://${username}.github.io/${repoName}/`;
    let pagesEnabled = false;
    
    // Check if pages already exists
    console.log('GitHub Deploy: Requesting GitHub Pages configuration details...');
    const checkPagesRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/pages`, { headers: ghHeaders });
    if (checkPagesRes.ok) {
      pagesEnabled = true;
      const cpData = await checkPagesRes.json() as { html_url: string };
      pagesUrl = cpData.html_url;
      console.log(`GitHub Deploy: GitHub Pages is already configured at: ${pagesUrl}`);
    } else {
      // Try to enable pages
      if (!isPrivate) {
        console.log('GitHub Deploy: Initiating GitHub Pages provisioning request...');
        const enablePagesRes = await fetch(`https://api.github.com/repos/${username}/${repoName}/pages`, {
          method: 'POST',
          headers: { ...ghHeaders, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            source: {
              branch: branchName,
              path: '/'
            }
          })
        });

        if (enablePagesRes.status === 201) {
          pagesEnabled = true;
          const epData = await enablePagesRes.json() as { html_url: string };
          pagesUrl = epData.html_url;
          console.log(`GitHub Deploy: GitHub Pages provisioned successfully! URL: ${pagesUrl}`);
        } else {
          const epErr = await enablePagesRes.text();
          console.log(`GitHub Deploy Warning: Could not configure pages automatically (expected on private repos or if pages is disallowed):`, epErr);
        }
      } else {
        console.log('GitHub Deploy: Repository is private, skipping automatic GitHub Pages activation.');
      }
    }

    res.json({
      success: true,
      repoUrl: repoData.html_url || `https://github.com/com/${username}/${repoName}`,
      pagesUrl: pagesUrl,
      pagesEnabled: pagesEnabled,
      message: 'Web application successfully pushed and deployed to GitHub!'
    });

  } catch (error: any) {
    console.error('GitHub Deploy Error:', error);
    res.status(500).json({ error: error?.message || 'An unexpected error occurred during deployment' });
  }
});

// Serve frontend assets
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
