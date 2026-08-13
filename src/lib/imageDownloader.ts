/**
 * Helper to download an image file (data URL or standard URL) to the user's computer.
 */
export const downloadOrderImage = (dataUrlOrUrl: string, filename: string): void => {
  if (!dataUrlOrUrl) return;

  // If base64 data URL
  if (dataUrlOrUrl.startsWith('data:')) {
    const link = document.createElement('a');
    link.href = dataUrlOrUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    return;
  }

  // If HTTP / HTTPS URL, fetch as blob to force download
  fetch(dataUrlOrUrl, { mode: 'cors' })
    .then((response) => response.blob())
    .then((blob) => {
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(url), 60000);
    })
    .catch((err) => {
      console.error('Error downloading image via fetch blob:', err);
      // Fallback: open directly in new tab or trigger link
      const link = document.createElement('a');
      link.href = dataUrlOrUrl;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    });
};
