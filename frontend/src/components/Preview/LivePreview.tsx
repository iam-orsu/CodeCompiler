'use client';

import React, { useState, useEffect } from 'react';
import { getInjectionHtml } from '../../lib/marketplace';

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

const generatePreviewHtml = (code: string, language: string, libraries: string[]) => {
  const deps = getInjectionHtml(libraries);
  
  if (language === 'react') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          ${deps}
          <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
          <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
          <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 16px; box-sizing: border-box; }
          </style>
        </head>
        <body>
          <div id="root"></div>
          <script type="text/babel">
${code}

// Auto-render if standard export pattern is detected and root is not explicitly rendered
if (typeof App !== 'undefined' && typeof root === 'undefined') {
  const domNode = document.getElementById('root');
  const root = ReactDOM.createRoot(domNode);
  root.render(<App />);
}
          </script>
        </body>
      </html>
    `;
  }

  if (language === 'vue') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          ${deps}
          <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 16px; box-sizing: border-box; }
          </style>
        </head>
        <body>
          <div id="app"></div>
          <script>
            // Expose Composition API
            const { createApp, ref, reactive, computed, watch, onMounted } = Vue;
            
            ${code}
            
            // Auto mount if App is defined and nothing was mounted yet
            setTimeout(() => {
              if (typeof App !== 'undefined' && document.getElementById('app').innerHTML === '') {
                createApp(App).mount('#app')
              }
            }, 0);
          </script>
        </body>
      </html>
    `;
  }

  if (language === 'angular') {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          ${deps}
          <script src="https://ajax.googleapis.com/ajax/libs/angularjs/1.8.2/angular.min.js"></script>
          <style>
            body { font-family: sans-serif; margin: 0; padding: 16px; box-sizing: border-box; }
          </style>
        </head>
        <body ng-app="runlyApp">
          ${code}
          
          <script>
            // Auto-initialize standard app container if they didn't manually define one
            try {
              if (!angular.module('runlyApp')) {
                 angular.module('runlyApp', []);
              }
            } catch(e) {
              angular.module('runlyApp', []);
            }
          </script>
        </body>
      </html>
    `;
  }

  // Vanilla HTML/JS Fallback
  return `
    <!DOCTYPE html>
    <html>
      <head>
        ${deps}
        <style>
          body { font-family: sans-serif; margin: 0; box-sizing: border-box; }
        </style>
      </head>
      <body>
        ${code}
      </body>
    </html>
  `;
};

interface LivePreviewProps {
  code: string;
  libraries: string[];
  language: string;
}

export default function LivePreview({ code, libraries, language }: LivePreviewProps) {
  const debouncedCode = useDebounce(code, 600);
  const [srcDoc, setSrcDoc] = useState('');

  useEffect(() => {
    const html = generatePreviewHtml(debouncedCode, language, libraries);
    setSrcDoc(html);
  }, [debouncedCode, language, libraries]);

  return (
    <div className="flex flex-col w-full h-full bg-[#161B22] overflow-hidden">
      {/* Subtle Header */}
      <div className="flex items-center gap-2 px-4 py-2 bg-[#1E232B] border-b border-[#2E3138] select-none text-xs text-gray-300 font-semibold tracking-wide">
        <span className="flex w-2 h-2 bg-red-500 rounded-full animate-[pulse_1.5s_ease-in-out_infinite] shadow-[0_0_8px_rgba(239,68,68,0.8)] relative top-[0.5px]"></span>
        Live Preview
      </div>
      
      {/* Iframe */}
      <div className="flex-1 bg-white relative w-full h-full">
        <iframe
          srcDoc={srcDoc}
          title="Live Preview"
          sandbox="allow-scripts allow-modals"
          className="w-full h-full border-none absolute inset-0 bg-white"
        />
      </div>
    </div>
  );
}
