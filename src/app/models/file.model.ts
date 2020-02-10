export interface IFile {
    id?: string,
    name: string,
    downloadUrl: string,
    path: string,
    parentId: string,
    mime: string,
    size: number,
    dateAdded: Date,
    dateModified: Date,
    checkedOutUserId?: string,
    checkedOutUserName?: string,
    checkedOutDate?: Date,
    category?: string,
    tags?: string[]
  }