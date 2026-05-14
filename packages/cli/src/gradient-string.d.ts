declare module 'gradient-string' {
  type GradientOptions = {
    interpolation?: 'rgb' | 'hsv' | string;
    hsvSpin?: 'short' | 'long' | string;
  };

  type Gradient = {
    (text: string, options?: GradientOptions): string;
    multiline(text: string, options?: GradientOptions): string;
  };

  type GradientFactory = {
    (...colors: string[]): Gradient;
    (colors: string[]): Gradient;
  };

  const gradient: GradientFactory;

  export default gradient;
}
