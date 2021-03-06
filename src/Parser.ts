import { LogLine } from '@interfaces/logline';
import { GeoData } from '@interfaces/geodata';
import iconv from 'iconv-lite';

export class Parser {
  constructor() {}

  public parseGeo(line: string): GeoData | undefined { // FIXME: Тут надо как-то поэлегантнее
    let r_geodata = new RegExp('{\(.*)}');
    let r_geodata2 = new RegExp(', ');
    let unparsedgeo = line.split(r_geodata)[1];
    if (unparsedgeo) {
      let geo = unparsedgeo.split(r_geodata2);
      if (geo[1].includes(':')) {
        return {
          country: geo[0],
          cc: geo[1].split(':')[1],
          ip: geo[2].split(':')[1],
          as: +geo[3].split(':')[1],
          ss: geo[4].split(':')[1],
          org: geo[5].split(':')[1],
          c: geo[6].split(':')[1]
        };
      } else {
        return {
          country: geo[0],
          ip: geo[1],
          as: +geo[2].replace('AS', ''),
          ss: geo[3],
        }
      }
    } else { // No geodata
      return undefined;
    }
  }

  public parseContent(line: string): string | undefined {
    let r_contentdata = new RegExp("'\(.*)'"); // Main
    let r_contentdata2 = new RegExp("\(\\(\[0-9]+\\)\)"); // Secondary
    let parsed = line.split(r_contentdata)[1];
    if (parsed) {
      return parsed;
    } else {
      if (line.split(r_contentdata2)[2]) {
        parsed = line.split(r_contentdata2)[2].trim();
        if (parsed) {
          if (!parsed.includes('{')) {
            return parsed;
          } else {
            return undefined;
          }
        } else {
          return undefined;
        }
      } else {
        return undefined;
      }
    }
  }

  private splitter(textplane: string): string[] {
    let lines: string[] = [];
    lines = textplane.split('\n');
    return lines;
  }

  public ANSItoUTF8(buffer: Buffer): string {
    return iconv.encode(iconv.decode(buffer, 'win1251'), 'utf8').toString();
  }
  public UTF8toANSI(buf: any): Buffer {
    return iconv.encode(buf.toString(), 'win1251');
  }
  public toUTF8(string: string | Buffer): string {
    if (typeof string == 'string') {
      return iconv.encode(iconv.decode(Buffer.from(string, 'binary'), 'win1251'), 'utf8').toString();
    } else {
      return iconv.encode(iconv.decode(string, 'win1251'), 'utf8').toString();
    }
  }

  public parse(textplane: string | Buffer): LogLine[] {
    let parsed: LogLine[] = [];
    this.splitter(this.toUTF8(textplane)).forEach((line: string) => {
      let splits = line.split(' ');
       if (splits[0] !== '') {
         let result: LogLine = {
           unix: +splits[0],
           date: new Date(+splits[0]*1000),
           process: splits[2],
           id: 0
         };
        for (let i = 3; i < splits.length; i++) {
          if (splits[i].match('(\[0-9]+)'))  {
            result.id = +splits[i].match('(\[0-9]+)')![0];
            break;
          }
        }
        result.geo = this.parseGeo(line);
        result.content = this.parseContent(line);
        if (splits[3].length > 3) {
          result.nickname = splits[3];
        } else {
          for (let i = 3; i < splits.length; i++) {
            if (splits[i - 1] == 'мин,') {
              result.nickname = splits[i];
              break;
            }
          }
        }

        parsed.push(result);
      }
    });
    return parsed;
  }
};
