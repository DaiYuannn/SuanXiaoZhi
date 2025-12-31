declare module 'multer';
declare module 'cors';

declare namespace Express {
  export interface Request {
    files?: any;
  }
}
