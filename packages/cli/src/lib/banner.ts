import gradient from 'gradient-string';
import figlet from 'figlet';

const GRADIENT = ['#06b6d4', '#8b5cf6', '#ec4899'];

export function printBanner(): void {
  const text = figlet.textSync('mDocs', { font: 'ANSI Shadow' });
  console.log(gradient(GRADIENT).multiline(text));
  console.log();
}
