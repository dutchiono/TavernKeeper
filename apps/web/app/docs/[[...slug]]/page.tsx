import { getDocBySlug, getAllDocs } from '@/lib/docs';
import { MDXRemote } from 'next-mdx-remote/rsc';
import { notFound } from 'next/navigation';

export async function generateStaticParams() {
    const allDocs = getAllDocs();
    return allDocs.map((slug) => ({
        slug,
    }));
}

export default async function DocPage(props: { params: Promise<{ slug?: string[] }> }) {
    const params = await props.params;
    const slug = params.slug || ['index'];
    const doc = await getDocBySlug(slug);

    if (!doc) {
        return notFound();
    }

    return (
        <article className="prose prose-invert max-w-none">
            <h1>{doc.title}</h1>
            <MDXRemote source={doc.content} />
        </article>
    );
}
