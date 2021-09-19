import * as FileSaver from 'file-saver';

/**
 * Given string file data, will initiate a browser file download.
 */
export function downloadString(data: any, filename: string, mimeType: string): void {
    const blob = new Blob([data], {type: mimeType});
    FileSaver.saveAs(blob, filename);
}

/**
 * Initiate download of a binary file response returned by the server.
 *
 * @param xhr: the server response
 */
export function downloadBlob(xhr: XMLHttpRequest): void {
    const blob = xhr.response;
    const filename = getFilenameFromContentDisposition(xhr);
    FileSaver.saveAs(blob, filename);
}

/**
 * Extracts the download file name from the content-disposition response
 * header.
 */
function getFilenameFromContentDisposition(xhr: XMLHttpRequest): string {
    const cd = xhr.getResponseHeader('content-disposition');
    return cd.match(/filename="?([^"]+)"?/)[1];
}
