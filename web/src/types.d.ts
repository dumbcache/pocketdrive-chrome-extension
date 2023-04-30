export interface GoogleFile {
    id: string;
    name: string;
    parents: string[];
    thumbnailLink?: string;
    // hasThumbnail: string;
    // mimeType: string;
    // createdTime: string;
    // modifiedTime: string;
    appProperties: {
        origin: string;
        src: string;
    };
}

export interface GoogleFileRes {
    files: GoogleFile[];
    nextPageToken?: string;
}

export interface GoogleSignInPayload {
    credential: string;
    select_by: string;
}
