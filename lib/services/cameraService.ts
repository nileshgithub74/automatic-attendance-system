// Camera Service for WebRTC Image Capture

export interface CameraConfig {
  width: number;
  height: number;
  facingMode: 'user' | 'environment';
  frameRate: number;
}

export interface CapturedImage {
  dataUrl: string;
  blob: Blob;
  timestamp: number;
  sequenceNumber: number;
}

export class CameraService {
  private stream: MediaStream | null = null;
  private videoElement: HTMLVideoElement | null = null;
  private canvasElement: HTMLCanvasElement | null = null;
  private captureInterval: NodeJS.Timeout | null = null;
  private sequenceNumber = 0;

  /**
   * Initialize camera stream
   */
  async initializeCamera(
    videoElement: HTMLVideoElement,
    config: Partial<CameraConfig> = {}
  ): Promise<void> {
    const defaultConfig: CameraConfig = {
      width: 1280,
      height: 720,
      facingMode: 'environment', // Back camera for classroom
      frameRate: 30,
    };

    const finalConfig = { ...defaultConfig, ...config };

    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: finalConfig.width },
          height: { ideal: finalConfig.height },
          facingMode: finalConfig.facingMode,
          frameRate: { ideal: finalConfig.frameRate },
        },
        audio: false,
      });

      this.videoElement = videoElement;
      this.videoElement.srcObject = this.stream;
      
      await new Promise<void>((resolve) => {
        this.videoElement!.onloadedmetadata = () => {
          this.videoElement!.play();
          resolve();
        };
      });

      console.log('✅ Camera initialized successfully');
    } catch (error) {
      console.error('❌ Camera initialization failed:', error);
      throw new Error('Failed to access camera. Please grant camera permissions.');
    }
  }

  /**
   * Capture single image from video stream
   */
  captureImage(): CapturedImage | null {
    if (!this.videoElement || !this.stream) {
      console.error('Camera not initialized');
      return null;
    }

    try {
      // Create canvas if not exists
      if (!this.canvasElement) {
        this.canvasElement = document.createElement('canvas');
      }

      const canvas = this.canvasElement;
      const video = this.videoElement;

      // Set canvas size to match video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw current video frame to canvas
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Convert to data URL
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);

      // Convert to blob
      const blob = this.dataURLToBlob(dataUrl);

      this.sequenceNumber++;

      return {
        dataUrl,
        blob,
        timestamp: Date.now(),
        sequenceNumber: this.sequenceNumber,
      };
    } catch (error) {
      console.error('Error capturing image:', error);
      return null;
    }
  }

  /**
   * Start automatic image capture at intervals
   */
  startAutomaticCapture(
    intervalSeconds: number,
    onCapture: (image: CapturedImage) => void,
    maxImages: number = 10
  ): void {
    if (this.captureInterval) {
      this.stopAutomaticCapture();
    }

    let capturedCount = 0;

    this.captureInterval = setInterval(() => {
      if (capturedCount >= maxImages) {
        this.stopAutomaticCapture();
        console.log(`✅ Captured ${maxImages} images`);
        return;
      }

      const image = this.captureImage();
      if (image) {
        capturedCount++;
        console.log(`📸 Captured image ${capturedCount}/${maxImages}`);
        onCapture(image);
      }
    }, intervalSeconds * 1000);

    console.log(`🎥 Started automatic capture: ${maxImages} images, every ${intervalSeconds}s`);
  }

  /**
   * Stop automatic capture
   */
  stopAutomaticCapture(): void {
    if (this.captureInterval) {
      clearInterval(this.captureInterval);
      this.captureInterval = null;
      console.log('⏹️ Stopped automatic capture');
    }
  }

  /**
   * Stop camera stream
   */
  stopCamera(): void {
    this.stopAutomaticCapture();

    if (this.stream) {
      this.stream.getTracks().forEach((track) => track.stop());
      this.stream = null;
    }

    if (this.videoElement) {
      this.videoElement.srcObject = null;
      this.videoElement = null;
    }

    this.sequenceNumber = 0;
    console.log('📷 Camera stopped');
  }

  /**
   * Check if camera is active
   */
  isActive(): boolean {
    return this.stream !== null && this.stream.active;
  }

  /**
   * Get available cameras
   */
  static async getAvailableCameras(): Promise<MediaDeviceInfo[]> {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === 'videoinput');
    } catch (error) {
      console.error('Error getting cameras:', error);
      return [];
    }
  }

  /**
   * Check camera permissions
   */
  static async checkCameraPermission(): Promise<'granted' | 'denied' | 'prompt'> {
    try {
      const result = await navigator.permissions.query({ name: 'camera' as PermissionName });
      return result.state;
    } catch (error) {
      // Fallback: try to access camera
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        stream.getTracks().forEach((track) => track.stop());
        return 'granted';
      } catch {
        return 'denied';
      }
    }
  }

  /**
   * Convert data URL to Blob
   */
  private dataURLToBlob(dataUrl: string): Blob {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);

    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }

    return new Blob([u8arr], { type: mime });
  }

  /**
   * Compress image
   */
  static compressImage(dataUrl: string, quality: number = 0.7): string {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.src = dataUrl;

    // Resize if too large
    const maxWidth = 1280;
    const maxHeight = 720;

    let width = img.width;
    let height = img.height;

    if (width > maxWidth) {
      height = (height * maxWidth) / width;
      width = maxWidth;
    }

    if (height > maxHeight) {
      width = (width * maxHeight) / height;
      height = maxHeight;
    }

    canvas.width = width;
    canvas.height = height;

    ctx?.drawImage(img, 0, 0, width, height);

    return canvas.toDataURL('image/jpeg', quality);
  }

  /**
   * Get camera info
   */
  getCameraInfo(): {
    active: boolean;
    width: number;
    height: number;
    deviceId?: string;
  } | null {
    if (!this.videoElement || !this.stream) {
      return null;
    }

    const videoTrack = this.stream.getVideoTracks()[0];
    const settings = videoTrack.getSettings();

    return {
      active: this.isActive(),
      width: this.videoElement.videoWidth,
      height: this.videoElement.videoHeight,
      deviceId: settings.deviceId,
    };
  }

  /**
   * Reset sequence number
   */
  resetSequence(): void {
    this.sequenceNumber = 0;
  }
}
