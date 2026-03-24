import React, { useState, useEffect } from 'react';
import { getInjectionHtml } from '../../lib/marketplace';
import { FileNode } from '../Explorer/FileExplorer';
import { Code2 } from 'lucide-react';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedValue(value); }, delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

const flattenFiles = (nodes: FileNode[], path = ''): Record<string, string> => {
  let result: Record<string, string> = {};
  nodes.forEach(node => {
    const currentPath = path ? `${path}/${node.name}` : node.name;
    if (node.type === 'file' && typeof node.content === 'string') {
      result[currentPath] = node.content;
    } else if (node.type === 'folder' && node.children) {
      result = { ...result, ...flattenFiles(node.children, currentPath) };
    }
  });
  return result;
};

const buildVanillaPreview = (flatFiles: Record<string, string>, deps: string, activeCode: string) => {
  let htmlContent = flatFiles['index.html'] || flatFiles['main.html'];
  
  if (!htmlContent) {
    const htmlFile = Object.keys(flatFiles).find(name => name.endsWith('.html'));
    if (htmlFile) htmlContent = flatFiles[htmlFile];
  }

  // Fallback if no HTML file exists
  if (!htmlContent || typeof htmlContent !== 'string') {
    return `<!DOCTYPE html><html><head>${deps || ''}<style>body{font-family:sans-serif;margin:16px;}</style></head><body>${activeCode || ''}</body></html>`;
  }

  // Link CSS files
  htmlContent = htmlContent.replace(/<link\s+[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (match, href) => {
    const cleanHref = href.replace(/^\.\//, '').replace(/^\//, '');
    if (flatFiles[cleanHref] !== undefined) return `<style>\n${flatFiles[cleanHref]}\n</style>`;
    return match;
  });

  // Link JS files
  htmlContent = htmlContent.replace(/<script\s+[^>]*src=["']([^"']+\.js)["'][^>]*><\/script>/gi, (match, src) => {
    const cleanSrc = src.replace(/^\.\//, '').replace(/^\//, '');
    if (flatFiles[cleanSrc] !== undefined) return `<script>\n${flatFiles[cleanSrc]}\n</script>`;
    return match;
  });

  // Inject marketplace dependencies
  if (deps) {
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${deps}</head>`);
    } else {
      htmlContent = `${deps}${htmlContent}`;
    }
  }

  return htmlContent;
};

const buildReactPreview = (flatFiles: Record<string, string>, deps: string, activeCode: string) => {
  const cssInject = Object.entries(flatFiles)
    .filter(([name]) => name.endsWith('.css'))
    .map(([_, content]) => `<style>${content}</style>`)
    .join('\n');

  const jsFiles = Object.entries(flatFiles).filter(([name]) => name.endsWith('.js') || name.endsWith('.jsx'));
  jsFiles.sort(([nameA], [nameB]) => {
    const isEntryA = /^(index|main|app)\./i.test(nameA);
    const isEntryB = /^(index|main|app)\./i.test(nameB);
    if (isEntryA && !isEntryB) return 1;
    if (!isEntryA && isEntryB) return -1;
    return 0;
  });

  const concatenatedJS = jsFiles.map(([name, content]) => {
    let transpiled = content
      .replace(/import\s+.*?from\s+['"].*?['"];?/g, '')
      .replace(/export\s+default\s+function/g, 'function')
      .replace(/export\s+default\s+class/g, 'class')
      .replace(/export\s+default\s+([^;\n]+)/g, 'const _defaultExport = $1')
      .replace(/export\s+(const|let|function|class)/g, '$1');
    return `// --- File: ${name} ---\n${transpiled}`;
  }).join('\n\n');

  return `<!DOCTYPE html>
<html>
  <head>
    ${deps || ''}
    <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
    <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
    <script crossorigin src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    ${cssInject}
  </head>
  <body>
    <div id="root"></div>
    <script type="text/babel">
${concatenatedJS || activeCode || ''}
if (typeof App !== 'undefined' && typeof root === 'undefined') {
  const domNode = document.getElementById('root');
  if (domNode && domNode.innerHTML === '') {
    const root = ReactDOM.createRoot(domNode);
    root.render(<App />);
  }
}
    </script>
  </body>
</html>`;
};

const buildVuePreview = (flatFiles: Record<string, string>, deps: string, activeCode: string) => {
  const cssInject = Object.entries(flatFiles)
    .filter(([name]) => name.endsWith('.css'))
    .map(([_, content]) => `<style>${content}</style>`)
    .join('\n');

  let htmlContent = flatFiles['index.html'] || flatFiles['main.html'] || '';
  if (!htmlContent) {
    const htmlFile = Object.keys(flatFiles).find(name => name.endsWith('.html'));
    if (htmlFile) htmlContent = flatFiles[htmlFile];
  }

  const jsFiles = Object.entries(flatFiles).filter(([name]) => name.endsWith('.js') || name.endsWith('.vue'));
  const concatenatedJS = jsFiles.map(([name, content]) => {
    return content.replace(/import\s+.*?from\s+['"].*?['"];?/g, '').replace(/export\s+default/g, 'const App =');
  }).join('\n\n');

  if (htmlContent) {
    htmlContent = htmlContent.replace(/<link\s+[^>]*href=["']([^"']+\.css)["'][^>]*>/gi, (match, href) => {
      const cleanHref = href.replace(/^\.\//, '').replace(/^\//, '');
      if (flatFiles[cleanHref] !== undefined) return `<style>\n${flatFiles[cleanHref]}\n</style>`;
      return match;
    });
    htmlContent = htmlContent.replace(/<script\s+[^>]*src=["']([^"']+\.js)["'][^>]*><\/script>/gi, (match, src) => {
      const cleanSrc = src.replace(/^\.\//, '').replace(/^\//, '');
      if (flatFiles[cleanSrc] !== undefined) return `<script>\n${flatFiles[cleanSrc]}\n</script>`;
      return match;
    });
    const headInject = `${deps || ''}\n<script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>\n${cssInject}`;
    if (htmlContent.includes('</head>')) {
      htmlContent = htmlContent.replace('</head>', `${headInject}\n</head>`);
    } else {
      htmlContent = `${headInject}\n${htmlContent}`;
    }
    return htmlContent;
  }

  return `<!DOCTYPE html>
<html>
  <head>
    ${deps || ''}
    <script crossorigin src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
    <style>body{font-family:sans-serif;margin:16px;}</style>
    ${cssInject}
  </head>
  <body>
    <div id="app"></div>
    <script>
${concatenatedJS || activeCode || ''}
setTimeout(() => {
  if (typeof App !== 'undefined' && document.getElementById('app').innerHTML === '') {
    Vue.createApp(App).mount('#app');
  }
}, 0);
    </script>
  </body>
</html>`;
};

const buildAngularPreview = (flatFiles: Record<string, string>, deps: string, activeCode: string) => {
  return `<!DOCTYPE html><html><head>${deps || ''}<script crossorigin src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script></head><body ng-app="runlyApp">${activeCode || ''}<script>try { if (!angular.module('runlyApp')) angular.module('runlyApp', []); } catch(e) { angular.module('runlyApp', []); }</script></body></html>`;
};

const generatePreviewHtml = (files: FileNode[], language: string, libraries: string[], activeCode: string) => {
  try {
    const deps = getInjectionHtml(libraries) || '';
    const flatFiles = flattenFiles(files);
  
    if (language === 'react') return buildReactPreview(flatFiles, deps, activeCode);
    if (language === 'vue') return buildVuePreview(flatFiles, deps, activeCode);
    if (language === 'angular') return buildAngularPreview(flatFiles, deps, activeCode);
    
    return buildVanillaPreview(flatFiles, deps, activeCode);
  } catch (err) {
    console.error("Preview generation error:", err);
    return `<!DOCTYPE html><html><body>Error generating preview: ${err}</body></html>`;
  }
};

interface LivePreviewProps {
  files: FileNode[];
  code: string;
  libraries: string[];
  language: string;
}

export default function LivePreview({ files, code, libraries, language }: LivePreviewProps) {
  const debouncedFiles = useDebounce(files, 500);
  const debouncedCode = useDebounce(code, 500);
  const [srcDoc, setSrcDoc] = useState(`<!DOCTYPE html><html><head></head><body>Loading preview...</body></html>`);

  useEffect(() => {
    const html = generatePreviewHtml(debouncedFiles, language, libraries, debouncedCode);
    setSrcDoc(html);
  }, [debouncedFiles, debouncedCode, language, libraries]);

  return (
    <div className="flex flex-col w-full h-full" style={{ background: 'var(--bg-base)' }}>
      {/* Iframe */}
      <div className="flex-1 bg-white flex w-full h-full">
        <iframe
          key={language}
          srcDoc={srcDoc}
          title="Live Preview"
          sandbox="allow-scripts allow-modals allow-same-origin"
          className="w-full h-full border-none bg-white block"
        />
      </div>
    </div>
  );
}
