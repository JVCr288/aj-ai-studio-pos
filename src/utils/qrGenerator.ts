import QRCode from 'qrcode';

export interface QRCodeGeneratorOptions {
  width?: number;
  margin?: number;
  errorCorrectionLevel?: 'L' | 'M' | 'Q' | 'H';
  darkColor?: string;
  lightColor?: string;
}

/**
 * Generates a PNG Data URL QR code specifically formatted for physical bay turnstile scanners.
 * Encodes the turnstileCode directly so that barcode/QR readers at studio entry authenticate instantly.
 */
export async function generateTurnstileQRCode(
  turnstileCode: string,
  options: QRCodeGeneratorOptions = {}
): Promise<string> {
  const {
    width = 300,
    margin = 2,
    errorCorrectionLevel = 'H',
    darkColor = '#09090b',
    lightColor = '#ffffff',
  } = options;

  if (!turnstileCode || turnstileCode.trim() === '') {
    throw new Error('turnstileCode is required for QR code generation');
  }

  try {
    const dataUrl = await QRCode.toDataURL(turnstileCode.trim(), {
      width,
      margin,
      errorCorrectionLevel,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });
    return dataUrl;
  } catch (error) {
    console.error('Failed to generate turnstile QR code data URL:', error);
    throw error;
  }
}

/**
 * Generates an SVG string representation of the turnstile QR code for vector rendering.
 */
export async function generateTurnstileQRCodeSVG(
  turnstileCode: string,
  options: QRCodeGeneratorOptions = {}
): Promise<string> {
  const {
    margin = 2,
    errorCorrectionLevel = 'H',
    darkColor = '#09090b',
    lightColor = '#ffffff',
  } = options;

  if (!turnstileCode || turnstileCode.trim() === '') {
    throw new Error('turnstileCode is required for QR code generation');
  }

  try {
    const svgString = await QRCode.toString(turnstileCode.trim(), {
      type: 'svg',
      margin,
      errorCorrectionLevel,
      color: {
        dark: darkColor,
        light: lightColor,
      },
    });
    return svgString;
  } catch (error) {
    console.error('Failed to generate turnstile QR code SVG:', error);
    throw error;
  }
}
