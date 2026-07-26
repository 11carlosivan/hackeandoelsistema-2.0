import Link from 'next/link';
import { authors, opinions } from '@/lib/main-design/mock-data';
import { EmptyState } from './content-primitives';
import SafeImage from './safe-image';

export default function OpinionPage({ opinionId }) {
  const opinion = opinions.find((item) => item.id === opinionId);

  if (!opinion) {
    return (
      <EmptyState
        title="OPINION NO ENCONTRADA"
        description="El registro solicitado no existe en el archivo editorial actual."
      />
    );
  }

  const author = authors.find((item) => item.id === opinion.authorId) || authors[0];

  return (
    <div className="max-w-5xl mx-auto">
      <article className="border border-terminal-gray bg-surface-container-low/25 p-6 md:p-10 relative overflow-hidden">
        <div className="absolute inset-0 scanline opacity-10 pointer-events-none" />
        <div className="relative z-10">
          <div className="font-label-caps text-system-red text-[10px] font-bold tracking-widest mb-5">
            OPINION / COLUMNA
          </div>
          <h1 className="font-headline-xl text-4xl md:text-[64px] text-white uppercase leading-none tracking-tight">
            {opinion.title}
          </h1>
          <blockquote className="border-l-4 border-system-red pl-6 my-8">
            <p className="font-headline-md text-2xl md:text-3xl text-white italic leading-tight">
              "{opinion.quote}"
            </p>
          </blockquote>
          <p className="text-on-surface-variant text-lg leading-relaxed">{opinion.content}</p>

          <Link
            href={`/perfil/${author.id}`}
            className="mt-10 flex items-center gap-4 border-t border-terminal-gray pt-6 group"
          >
            <SafeImage className="w-12 h-12 rounded-full object-cover border border-system-red" alt={author.name} src={author.photo} />
            <div>
              <div className="font-label-caps text-[10px] text-system-red">{opinion.date}</div>
              <div className="font-bold text-white group-hover:text-system-red">{author.name}</div>
            </div>
          </Link>
        </div>
      </article>
    </div>
  );
}
