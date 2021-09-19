/**
 * Checks for illegal characters in the given input, eg. module or collaboration invitee name.
 */
function isValid(input: string): boolean {
    input = input.trim();
    const forbidden = /[<>`'"]/g;
    const invalid = input.match(forbidden);

    return (input.length > 0 && !invalid);
}

function validateUploadedConnections(fileList: File[]): string {
    if (fileList.length === 0) {
        return 'Please choose a file.'
        /* Ideally, we would use File.type, which is set by browsers.
         * However, browsers such as Edge don't have a mime-type for
         * '.csv', so we have to check the extension manually.
         */
    } else if (getFileExtension(fileList[0].name) !== 'csv') {
        return 'Only CSV files can be uploaded.';
    }
    return '';
}

function getFileExtension(fileName: string): string {
    return fileName.split('.').pop();
}

export default {
    isValid: isValid,
    validateUploadedConnections: validateUploadedConnections,
}