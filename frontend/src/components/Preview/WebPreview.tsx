'use client';

import React, { useEffect, useRef } from 'react';
import styles from './WebPreview.module.css';
import { getInjectionHtml } from '../../lib/marketplace';

interface WebPreviewProps {
  code: string;
  libraries: string[];
  language: string;
}

export default function WebPreview({ code, libraries, language }: WebPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const deps = getInjectionHtml(libraries);
    let docContent = '';

    if (language === 'html') {
      docContent = `
        <!DOCTYPE html>
        <html>
          <head>
            ${deps}
          </head>
          <body>
            ${code}
          </body>
        </html>
      `;
    } else if (language === 'react') {
      docContent = `
        <!DOCTYPE html>
        <html>
          <head>
            ${deps}
            <script crossorigin src="https://unpkg.com/react@18/umd/react.development.js"></script>
            <script crossorigin src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
            <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
          </head>
          <body>
            <div id="root"></div>
            <script type="text/babel">
              ${code}
            </script>
          </body>
        </html>
      `;
    } else if (language === 'vue') {
      docContent = `
        <!DOCTYPE html>
        <html>
          <head>
            ${deps}
            <script src="https://unpkg.com/vue@3/dist/vue.global.js"></script>
          </head>
          <body>
            ${code}
          </body>
        </html>
      `;
    } else if (language === 'angular') {
      docContent = `
        <!DOCTYPE html>
        <html>
          <head>
            ${deps}
          </head>
          <body>
            ${code}
          </body>
        </html>
      `;
    } else {
      docContent = `
        <!DOCTYPE html>
        <html>
          <head>
            ${deps}
          </head>
          <body>
            ${code}
          </body>
        </html>
      `;
    }

    if (iframe.contentWindow) {
      iframe.srcdoc = docContent;
    }
  }, [code, libraries, language]);

  return (
    <div className={styles.container}>
      <iframe 
        ref={iframeRef} 
        className={styles.iframe} 
        title="Web Preview"
        sandbox="allow-scripts allow-popups allow-modals allow-forms"
      />
    </div>
  );
}
