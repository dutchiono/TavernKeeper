import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const docsDirectory = path.join(process.cwd(), 'site-docs/docs');

export interface Doc {
    slug: string[];
    title: string;
    content: string;
    meta: {
        [key: string]: any;
    };
}

export function getAllDocs(): string[][] {
    const fileNames = getAllFiles(docsDirectory);
    return fileNames.map((fileName) => {
        const relativePath = path.relative(docsDirectory, fileName);
        return relativePath.replace(/\.mdx?$/, '').split(path.sep);
    });
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        if (fs.statSync(dirPath + '/' + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + '/' + file, arrayOfFiles);
        } else {
            if (file.endsWith('.md') || file.endsWith('.mdx')) {
                arrayOfFiles.push(path.join(dirPath, '/', file));
            }
        }
    });

    return arrayOfFiles;
}

export async function getDocBySlug(slug: string[]): Promise<Doc | null> {
    const realSlug = slug.join('/');
    const fullPathMd = path.join(docsDirectory, `${realSlug}.md`);
    const fullPathMdx = path.join(docsDirectory, `${realSlug}.mdx`);

    // Handle index pages (e.g. docs/getting-started/index.md)
    const fullPathIndexMd = path.join(docsDirectory, realSlug, 'index.md');
    const fullPathIndexMdx = path.join(docsDirectory, realSlug, 'index.mdx');

    let fullPath = '';
    if (fs.existsSync(fullPathMd)) fullPath = fullPathMd;
    else if (fs.existsSync(fullPathMdx)) fullPath = fullPathMdx;
    else if (fs.existsSync(fullPathIndexMd)) fullPath = fullPathIndexMd;
    else if (fs.existsSync(fullPathIndexMdx)) fullPath = fullPathIndexMdx;
    else return null;

    const fileContents = fs.readFileSync(fullPath, 'utf8');
    const { data, content } = matter(fileContents);

    return {
        slug,
        title: data.title || slug[slug.length - 1],
        content,
        meta: data,
    };
}
