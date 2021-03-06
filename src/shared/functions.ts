import app from '@server';
import md5 from 'md5';
import jwt from 'jsonwebtoken';
import { Logger } from './Logger';
import { WSMessage } from '@interfaces/ws.message';
import { parser, watcher } from './constants';
import { LogLine } from '@interfaces/logline';
import { LOG_LINE } from '@schemas/logline.schema';
import { readdir, lstatSync, readFile } from 'fs';
import { join } from 'path';
import { User } from '@interfaces/user';

export const watch = (): void => {
  watcher.result$.subscribe((buffer: Buffer) => {
    parser.parse(buffer).forEach((line: LogLine) => {
      let ln = new LOG_LINE(line);
      ln.save();
    })
  }, (err) => { Logger.log('error', err) });
}

export const isDate = (date :string): boolean => {
  return (Date.parse(date) != NaN) && (date !== '') && date !== undefined;
} ;

export const pErr = (err: Error) => {
    if (err) {
        Logger.log('error', err);
    }
};

export const getRandomInt = () => {
    return Math.floor(Math.random() * 1_000_000_000_000);
};

export const firstLaunch = (dir: string): void => {
  readdir(dir, (err: NodeJS.ErrnoException | null, dirs: any[]) => {
    if (err) return err;
    for (let i = 0; i < dirs.length; i++) {
      if (typeof dirs[i] == 'string') {
        let fullPath = join(dir, dirs[i]);
        if (lstatSync(fullPath).isDirectory()) {
          firstLaunch(fullPath);
        } else {
          readFile(fullPath,(err: NodeJS.ErrnoException | null, buffer: Buffer) => {
            if (err) return err;
            parser.parse(buffer).forEach((line: LogLine) => {
              let ln = new LOG_LINE(line);
              ln.save();
            });
          })
        }
      }
    }
  });
}

export const getMimeType = (path:string): string | undefined => {
  let splited = path.split('.');
  switch (splited[splited.length - 1]) {
    case 'amx': return 'application/octet-stream';
    case 'so': return 'application/x-sharedlib';
    case 'db': return 'application/octet-stream';
    case 'cadb': return 'application/octet-stream';
  }
}

export const checkPassword = (pass: string, hash: string): boolean => {
    let salt = hash.slice(0, hash.length - 32);
    let realPassword = hash.slice(hash.length - 32, hash.length);
    let password = md5(salt + pass);
    if (password === realPassword) {
      return true;
    } else {
      return false;
    }
  }
export const generateToken = (userInfo: any): string => {
  return jwt.sign(userInfo, app.get('secret'), { algorithm: 'HS256'});
}
export const verifyToken = (token: string): boolean => {
  return jwt.decode(token, app.get('secret')) ? true : false;
}
export const decodeToken = (token: string): User | null => {
  const user = jwt.decode(token, app.get('secret'));
  if (!user) return null;
  return {
    name: user.user,
    id: user.id,
    group_id: user.group_id
  };
}
export const isWorkGroup = (group: number | string): boolean => {
  group = group.toString();
  return group.includes('9') || group.includes('10') || group.includes('11') || group.includes('12') || group.includes('13');
}

export const wsmsg = (msg: WSMessage): string => {
  return JSON.stringify(msg);
}
