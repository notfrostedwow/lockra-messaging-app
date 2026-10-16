import { format, formatDistanceToNow } from 'date-fns';

export function getInitials(name: string): string {
  if (!name) return '?';
  
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

export function getAvatarColor(name: string): string {
  if (!name) return '#3A76F0';
  
  // Generate a consistent color based on the username
  const colors = [
    '#3A76F0', // primary blue
    '#00C896', // accent green
    '#FF6B6B', // coral
    '#FFD166', // yellow
    '#845EC2', // purple
    '#F58634', // orange
  ];
  
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function formatDate(date: string | Date): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return format(dateObj, 'MMMM d, yyyy');
}

export function formatMessageDate(date: string | Date): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // If message is from today, show only time in 24-hour format
  if (messageDate.toDateString() === now.toDateString()) {
    return format(messageDate, 'HH:mm');
  }
  
  // If message is from this week, show day of week
  if (now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return format(messageDate, 'EEE');
  }
  
  // Otherwise show date
  return format(messageDate, 'MMM d');
}

export function formatRelativeTime(date: string | Date): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // If less than a minute ago
  if (now.getTime() - messageDate.getTime() < 60 * 1000) {
    return 'now';
  }
  
  // If less than 24 hours ago, show relative time
  if (now.getTime() - messageDate.getTime() < 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(messageDate, { addSuffix: false });
  }
  
  // If message is from this week, show day of week
  if (now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return format(messageDate, 'EEE');
  }
  
  // Otherwise show date
  return format(messageDate, 'M/d/yy');
}

export function formatChatTimestamp(date: string | Date): string {
  const messageDate = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  
  // If less than 24 hours ago, show relative time
  if (now.getTime() - messageDate.getTime() < 24 * 60 * 60 * 1000) {
    return formatDistanceToNow(messageDate, { addSuffix: false });
  }
  
  // If message is from this week, show day of week
  if (now.getTime() - messageDate.getTime() < 7 * 24 * 60 * 60 * 1000) {
    return format(messageDate, 'EEE');
  }
  
  // Otherwise show date
  return format(messageDate, 'M/d/yy');
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

export function validateUsername(username: string): boolean {
  // 3-20 characters, letters, numbers, and underscores only
  const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
  return usernameRegex.test(username);
}

export function validatePassword(password: string): boolean {
  // At least 8 characters
  return password.length >= 8;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

/**
 * Determines the optimal compression parameters for an image based on its size
 * while maintaining original aspect ratio and quality
 * @param fileSize File size in bytes
 * @param originalWidth Original image width (if available)
 * @param originalHeight Original image height (if available)
 * @returns Object containing compression quality and target dimensions
 */
export function getImageCompressionParams(
  fileSize: number,
  originalWidth?: number,
  originalHeight?: number
): {
  quality: number;
  width: number | undefined;
  height: number | undefined;
  preserveAspectRatio: boolean;
} {
  // Start with high quality
  let quality = 0.9;
  let width: number | undefined = undefined;
  let height: number | undefined = undefined;
  const preserveAspectRatio = true;
  
  // Only resize if we know the original dimensions
  if (originalWidth && originalHeight) {
    // Calculate max dimension based on file size
    let maxDimension = Math.max(originalWidth, originalHeight);
    
    // Adjust parameters based on file size
    if (fileSize > 10 * 1024 * 1024) { // > 10MB
      quality = 0.7;
      maxDimension = Math.min(maxDimension, 1800);
    } else if (fileSize > 5 * 1024 * 1024) { // > 5MB
      quality = 0.8;
      maxDimension = Math.min(maxDimension, 2000);
    } else if (fileSize > 2 * 1024 * 1024) { // > 2MB
      quality = 0.85;
      maxDimension = Math.min(maxDimension, 2400);
    } else if (fileSize > 1 * 1024 * 1024) { // > 1MB
      quality = 0.9;
      // Only resize if it's really large
      if (maxDimension > 3000) {
        maxDimension = 3000;
      } else {
        // Don't resize smaller images
        maxDimension = Math.max(originalWidth, originalHeight);
      }
    }
    
    // Calculate new dimensions while preserving aspect ratio
    if (originalWidth >= originalHeight) {
      width = maxDimension;
      height = Math.round((originalHeight / originalWidth) * maxDimension);
    } else {
      height = maxDimension;
      width = Math.round((originalWidth / originalHeight) * maxDimension);
    }
    
    // Don't upscale images
    if (width > originalWidth || height > originalHeight) {
      width = originalWidth;
      height = originalHeight;
    }
  } else {
    // If we don't know dimensions, just adjust quality based on file size
    if (fileSize > 10 * 1024 * 1024) { // > 10MB
      quality = 0.7;
    } else if (fileSize > 5 * 1024 * 1024) { // > 5MB
      quality = 0.8;
    } else if (fileSize > 2 * 1024 * 1024) { // > 2MB
      quality = 0.85;
    }
  }
  
  return { quality, width, height, preserveAspectRatio };
}