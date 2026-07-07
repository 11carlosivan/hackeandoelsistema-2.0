import { jsonLdFromResolvedRoute } from '@/lib/seo/metadata';
import { buildPayloadForResolvedRoute } from '@/lib/contracts/payload-builders';

export function ResolvedRouteView({ resolvedRoute }) {
  const entity = resolvedRoute.entity;
  const jsonLd = jsonLdFromResolvedRoute(resolvedRoute);
  const payload = buildPayloadForResolvedRoute(resolvedRoute);

  return (
    <div className="hes-container py-12">
      {jsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      ) : null}

      <p className="hes-kicker">{resolvedRoute.entityType}</p>
      <h1 className="mt-4 max-w-4xl text-4xl font-black leading-tight text-white md:text-6xl">
        {entity?.title ?? resolvedRoute.path}
      </h1>
      {entity?.description || entity?.excerpt ? (
        <p className="mt-5 max-w-2xl text-lg leading-8 text-on-surface-variant">
          {entity.description ?? entity.excerpt}
        </p>
      ) : null}

      {entity?.content ? (
        <article className="mt-10 max-w-3xl border-l-4 border-system-red bg-surface-container p-6 text-base leading-8 text-on-surface-variant">
          {entity.content}
        </article>
      ) : null}

      <dl className="mt-10 grid gap-4 border-t border-terminal-gray pt-6 text-sm md:grid-cols-3">
        <div>
          <dt className="font-bold text-white">Route</dt>
          <dd className="mt-1 text-on-surface-variant">{resolvedRoute.path}</dd>
        </div>
        <div>
          <dt className="font-bold text-white">HTTP</dt>
          <dd className="mt-1 text-on-surface-variant">{resolvedRoute.httpStatus}</dd>
        </div>
        <div>
          <dt className="font-bold text-white">Sitemap</dt>
          <dd className="mt-1 text-on-surface-variant">
            {resolvedRoute.includeInSitemap ? 'Incluida' : 'Excluida'}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-white">Payload</dt>
          <dd className="mt-1 text-on-surface-variant">{payload.route.entityType}</dd>
        </div>
      </dl>
    </div>
  );
}
