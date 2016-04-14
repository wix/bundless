import fs = require('fs-extra');
import path = require('path');

export class PackageBuilder {
    constructor(private name: string, private rootDir: string) {
        const packageJson = {
            name
        };
        this.writeFile('package.json', packageJson);
    }

    addFile(fileName: string, content: string = ''): PackageBuilder {
        this.writeFile(fileName, content);
        return this;
    }

    addMainFile(fileName: string, content: string = ''): PackageBuilder {
        this.writeFile(fileName, content);
        const packageJson: Object = this.readJSON('package.json');
        packageJson["main"] = fileName;
        this.writeFile('package.json', packageJson);
        return this;
    }

    addPackage(name: string): PackageBuilder {
        const newPath: string = path.resolve(this.rootDir, 'node_modules', name);
        return new PackageBuilder(name, newPath);
    }

    getPath(): string {
        return this.rootDir;
    }

    dispose(): void {
        fs.removeSync(this.rootDir);
    }

    private writeFile(filePath: string, content: string | Object): void {
        const finalContent = typeof content === 'object' ? JSON.stringify(content, null, 4) : content;
        const fullPath = this.getFullName(filePath);
        fs.ensureFileSync(fullPath);
        fs.writeFileSync(fullPath, finalContent);
    }

    private readFile(filePath: string): string {
        const fullPath = this.getFullName(filePath);
        return fs.readFileSync(fullPath).toString();
    }

    private readJSON(filePath: string): Object {
        return JSON.parse(this.readFile(filePath));
    }

    private getFullName(fileName: string): string {
        return path.resolve(this.rootDir, fileName);
    }
}

export default function project(rootDir: string): PackageBuilder {
    return new PackageBuilder('project-root', rootDir);
}
