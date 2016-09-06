import {ProjectMap} from "./../project-mapper";

function getExt(fileName: string): string {
    const slashIndex = fileName.lastIndexOf('/');
    const dotIndex = fileName.lastIndexOf('.');
    return (dotIndex > slashIndex) ? fileName.slice(dotIndex) : '';
}

function normalizeTail(name: string, ignorePattern:RegExp): string {
    if (ignorePattern && name.match(ignorePattern)){
        return name;
    }
    const ext = getExt(name);
    if(ext === '.js' || ext === '.json' || ext === '.') {
        return name;
    } else {
        return name + '.js';
    }
}

function resolveAsPackage(projectMap: ProjectMap, parsedSource: ParsedSource, noJSExtension?:RegExp): string {
    if(parsedSource.pkg in projectMap.packages) {
        const { p: moduleSource, m: modulePath } = projectMap.packages[parsedSource.pkg];
        const tail = parsedSource.localPath || modulePath;
        return moduleSource + '/' + normalizeTail(tail, noJSExtension);
    } else {
        return null;
    }
}

function isDefaultIndexDir(projectMap: ProjectMap, filePath: string): boolean {
    const key = filePath.charAt(filePath.length - 1) === '/'
        ? filePath.slice(0, -1) + '.js'
        : filePath;
    return projectMap.dirs.indexOf(key) > -1;
}

function stripJsExt(pathName: string): string {
    if(getExt(pathName) === '.js') {
        return pathName.slice(0,-3);
    } else {
        return pathName;
    }
}

export interface ParsedUrl {
    pkg: string;
    pkgPath: string;
    localPath: string;
    ext: string;
}

export interface ParsedSource {
    pkg: string;
    localPath: string;
    ext: string;
}

export function parseSource(source: string): ParsedSource {
    const segments = source.split('/');
    if(segments[0] === '.' || segments[0] === '..') {
        return {
            pkg: '',
            localPath: source,
            ext: getExt(source)
        }
    } else {
        return {
            pkg: segments[0],
            localPath: segments.slice(1).join('/'),
            ext: getExt(source)
        }
    }
}

export function parseUrl(url: string, baseUrl: string, libMount: string): ParsedUrl {
    const ext: string = getExt(url);
    const urlPath: string = url.slice(baseUrl.length); 
    const segments = urlPath.split('/');
    const libSegments = libMount.split('/');
    const startIndex = libSegments.every((segment, index) => segment === segments[index])
        ? libSegments.length
        : -1;
    if(startIndex > -1) {
        const pkgIndex = segments
            .reduce((acc: number, it: string, index: number, list: string[]) => {
                return (index > startIndex && list[index-1] === 'node_modules') ? index : acc;
            }, startIndex);
        return {
            pkg: segments[pkgIndex],
            pkgPath: segments.slice(0,pkgIndex+1).join('/'),
            localPath: segments.slice(pkgIndex+1).join('/'),
            ext
        }
    } else {
        return {
            pkg: '',
            pkgPath: '',
            localPath: urlPath,
            ext
        };
    }
}

export function joinUrl(baseUrl: string, ...paths: string[]): string {
    let result = baseUrl;
    paths.forEach(path => {
        if(result.charAt(result.length-1) !== '/') {
            result += '/';
        }
        if(path.charAt(0) === '/') {
            result += path.slice(1);
        } else {
            result += path;
        }
    });
    return result;
}

export function preProcess(projectMap: ProjectMap, name: string, parentName?: string, parentAddress?: string, noJSExtension?:RegExp): string {
    const parsedSource: ParsedSource = parseSource(name);
    if(!parsedSource.pkg) {
        return normalizeTail(name, noJSExtension);
    } else {
        const pkgMainFilePath = resolveAsPackage(projectMap, parsedSource, noJSExtension);
        if(pkgMainFilePath) {
            return pkgMainFilePath;
        } else {
            return normalizeTail(name, noJSExtension);
        }
    }
}

export function applyFileRemapping(projectMap: ProjectMap, url: ParsedUrl): string {
    const origPath = joinUrl(url.pkgPath, url.localPath);
    const localFile = './' + url.localPath;
    if(url.pkg && url.pkg in projectMap.packages) {
        const pkgRec = projectMap.packages[url.pkg];
        if(url.localPath === '') {
            return joinUrl(url.pkgPath, pkgRec.m);
        }
        if(pkgRec.r && localFile in pkgRec.r) {
            return joinUrl(url.pkgPath, pkgRec.r[localFile].slice(2));
        }
    }
    return origPath;
}

export function postProcess(projectMap: ProjectMap, baseUrl: string, resolvedName: string, noJSExtension?:RegExp): string {
    const filePath: string = resolvedName.slice(baseUrl.length);
    if(isDefaultIndexDir(projectMap, '/' + filePath)) {
        return joinUrl(baseUrl, stripJsExt(filePath), 'index.js');
    } else {
        const url: ParsedUrl = parseUrl(resolvedName, baseUrl, projectMap.libMount);
        const remappedFile: string = applyFileRemapping(projectMap, url);
        return joinUrl(baseUrl, remappedFile);
    }
}