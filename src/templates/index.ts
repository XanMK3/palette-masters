import landing from './landing.html?raw';
import magazine from './magazine.html?raw';
import poster from './poster.html?raw';
import './reference.css';
import './shared.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import '@fontsource/inter/800.css';
import '@fontsource/playfair-display/600.css';
import '@fontsource/playfair-display/800.css';
import '@fontsource/playfair-display/400-italic.css';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import {
  createIcons,
  Sparkles,
  Zap,
  ArrowRight,
  PlayCircle,
  Cpu,
  Eye,
  Code2,
  Palette,
} from 'lucide';

export function mountTemplates(): void {
  const stage = document.getElementById('themeStage');
  if (!stage) throw new Error('Missing template stage');
  // These are trusted, bundled HTML files; artwork metadata is set through textContent.
  stage.innerHTML = landing + magazine + poster;
  createIcons({ icons: { Sparkles, Zap, ArrowRight, PlayCircle, Cpu, Eye, Code2, Palette } });
}
