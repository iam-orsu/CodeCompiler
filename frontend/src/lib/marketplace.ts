export interface MarketplaceLibrary {
  id: string;
  name: string;
  type: 'css' | 'ui' | 'js' | 'icon';
  url: string;
  requires?: string[];
  initScript?: string;
}

export const LIBRARIES: MarketplaceLibrary[] = [
  { id: 'tailwind', name: 'Tailwind CSS', type: 'css', url: 'https://cdn.tailwindcss.com' },
  { id: 'bootstrap', name: 'Bootstrap', type: 'css', url: 'https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css' },
  { id: 'bulma', name: 'Bulma', type: 'css', url: 'https://cdn.jsdelivr.net/npm/bulma@1.0.0/css/bulma.min.css' },
  
  { id: 'daisyui', name: 'daisyUI', type: 'ui', url: 'https://cdn.jsdelivr.net/npm/daisyui@4.10.1/dist/full.min.css', requires: ['tailwind'] },
  { id: 'flowbite', name: 'Flowbite', type: 'ui', url: 'https://cdnjs.cloudflare.com/ajax/libs/flowbite/2.3.0/flowbite.min.css', requires: ['tailwind'] },
  
  { id: 'jquery', name: 'jQuery', type: 'js', url: 'https://code.jquery.com/jquery-3.7.1.min.js' },
  { id: 'lodash', name: 'Lodash', type: 'js', url: 'https://cdn.jsdelivr.net/npm/lodash@4.17.21/lodash.min.js' },
  { id: 'chartjs', name: 'Chart.js', type: 'js', url: 'https://cdn.jsdelivr.net/npm/chart.js' },
  { id: 'threejs', name: 'Three.js', type: 'js', url: 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js' },
  { id: 'gsap', name: 'GSAP', type: 'js', url: 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js' },
  
  { id: 'fontawesome', name: 'FontAwesome', type: 'icon', url: 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css' },
  { id: 'lucide', name: 'Lucide Icons', type: 'icon', url: 'https://unpkg.com/lucide@latest' }
];

export function getInjectionHtml(selectedIds: string[]): string {
  let html = '';
  
  // Tailwind optimization to prevent FOUC
  if (selectedIds.includes('tailwind')) {
    html += `<script src="https://cdn.tailwindcss.com"></script>\n`;
    html += `<script>
      tailwind.config = {
        theme: { extend: {} },
        corePlugins: { preflight: true }
      }
    </script>\n`;
  }
  
  // Sort libraries taking requirements into account
  const ordered = [...selectedIds].sort((a, b) => {
    const libA = LIBRARIES.find(l => l.id === a);
    const libB = LIBRARIES.find(l => l.id === b);
    if (libA?.requires?.includes(b)) return 1;
    if (libB?.requires?.includes(a)) return -1;
    return 0;
  });

  for (const id of ordered) {
    if (id === 'tailwind') continue; // Handled above
    const lib = LIBRARIES.find(l => l.id === id);
    if (!lib) continue;

    if (lib.url.endsWith('.css')) {
      html += `<link rel="stylesheet" href="${lib.url}" />\n`;
    } else {
      html += `<script src="${lib.url}"></script>\n`;
    }
    
    if (lib.initScript) {
      html += `<script>${lib.initScript}</script>\n`;
    }
  }

  return html;
}
