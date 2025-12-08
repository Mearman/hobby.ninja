import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import {
  getItemById,
  getAllItems
} from '@/lib/graph-data';
import {
  getNodeDisplayName,
  getNodePrice,
  getNodeReleaseYear,
  getNodeImages,
  type ItemNode
} from '@/lib/schemas';

interface ItemPageProps {
  params: Promise<{ id: string }>;
}

// Generate static params for all items (limited for testing)
export async function generateStaticParams() {
  const items = await getAllItems();

  // Limit to first 100 items for testing
  // Remove this slice to generate all 6,009+ items
  return items.slice(0, 100).map((item) => ({
    id: item.id,
  }));
}

// Generate metadata for each item with type-safe data
export async function generateMetadata({ params }: ItemPageProps): Promise<Metadata> {
  const { id } = await params;
  const item = await getItemById(id);

  if (!item) {
    return {
      title: 'Item Not Found',
    };
  }

  const displayName = getNodeDisplayName(item);
  const releaseYear = getNodeReleaseYear(item);

  return {
    title: `${displayName} - hobby.ninja`,
    description: item.description
      ? `${item.description.substring(0, 160)}...`
      : `Details about ${displayName}${releaseYear ? ` (${releaseYear})` : ''} from the hobby.ninja database`,
    keywords: [
      'gunpla', 'gundam', 'model kit',
      item.brand, item.category, item.series, item.grade,
      item.scale
    ].filter(Boolean).join(', '),
  };
}

export default async function ItemPage({ params }: ItemPageProps) {
  const { id } = await params;
  const item = await getItemById(id);

  if (!item) {
    notFound();
  }

  const displayName = getNodeDisplayName(item);
  const price = getNodePrice(item);
  const releaseYear = getNodeReleaseYear(item);
  const images = getNodeImages(item);

  return (
    <div>
      <nav>
        <a href="/">← Back to Home</a>
        <a href="/database/gunpla/">← Gunpla Database</a>
      </nav>

      <article>
        <header>
          <h1>{displayName}</h1>
          <div className="item-meta">
            {item.brand && <span>Brand: {item.brand}</span>}
            {item.category && <span>Category: {item.category}</span>}
            {item.series && <span>Series: {item.series}</span>}
            {item.grade && <span>Grade: {item.grade}</span>}
            {item.scale && <span>Scale: {item.scale}</span>}
            {price && <span>Price: {price}</span>}
            {releaseYear && <span>Release: {releaseYear}</span>}
            {item.targetAge && <span>Age: {item.targetAge}+</span>}
          </div>
        </header>

        {item.description && (
          <section>
            <h2>Description</h2>
            <p>{item.description}</p>
          </section>
        )}

        {images.length > 0 && (
          <section>
            <h2>Images</h2>
            <div className="image-gallery">
              {images.map((image, index) => (
                <img
                  key={index}
                  src={image}
                  alt={`${displayName} - Image ${index + 1}`}
                  loading="lazy"
                />
              ))}
            </div>
          </section>
        )}

        {item.manuals && item.manuals.length > 0 && (
          <section>
            <h2>Manuals</h2>
            <ul>
              {item.manuals.map((manual, index) => {
                const manualId = typeof manual === 'string' ? manual : manual.id;
                return (
                  <li key={index}>
                    <a href={`/manual/${manualId}`}>
                      View Manual {index + 1}
                    </a>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {/* Price details */}
        {item.price && (
          <section>
            <h2>Price Information</h2>
            <dl>
              <dt>Amount</dt>
              <dd>{item.price.currency} {item.price.amount.toLocaleString()}</dd>
              {item.price.taxIncluded !== undefined && (
                <>
                  <dt>Tax</dt>
                  <dd>{item.price.taxIncluded ? 'Included' : 'Excluded'}</dd>
                </>
              )}
              {item.price.taxRate && (
                <>
                  <dt>Tax Rate</dt>
                  <dd>{item.price.taxRate}%</dd>
                </>
              )}
            </dl>
          </section>
        )}

        {/* Release date details */}
        {item.releaseDate && (
          <section>
            <h2>Release Information</h2>
            <dl>
              <dt>Japanese Date</dt>
              <dd>{item.releaseDate.ja}</dd>
              <dt>Year</dt>
              <dd>{item.releaseDate.year}</dd>
              <dt>Month</dt>
              <dd>{item.releaseDate.month}</dd>
              <dt>Day</dt>
              <dd>{item.releaseDate.day}</dd>
            </dl>
          </section>
        )}

        {/* Specifications */}
        {item.specifications && Object.keys(item.specifications).length > 0 && (
          <section>
            <h2>Specifications</h2>
            <dl>
              {Object.entries(item.specifications).map(([key, value]) => (
                <div key={key}>
                  <dt>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</dt>
                  <dd>
                    {typeof value === 'object'
                      ? JSON.stringify(value, null, 2)
                      : String(value)
                    }
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}

        {/* Additional metadata */}
        {item.metadata && Object.keys(item.metadata).length > 0 && (
          <section>
            <h2>Additional Information</h2>
            <dl>
              {Object.entries(item.metadata).map(([key, value]) => {
                if (
                  value === null ||
                  value === undefined ||
                  (typeof value === 'string' && value.trim() === '')
                ) {
                  return null;
                }

                return (
                  <div key={key}>
                    <dt>{key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</dt>
                    <dd>
                      {typeof value === 'object'
                        ? JSON.stringify(value, null, 2)
                        : String(value)
                      }
                    </dd>
                  </div>
                );
              })}
            </dl>
          </section>
        )}

        {/* Tags */}
        {item.tags && item.tags.length > 0 && (
          <section>
            <h2>Tags</h2>
            <div className="tags">
              {item.tags.map((tag, index) => (
                <span key={index} className="tag">
                  {tag}
                </span>
              ))}
            </div>
          </section>
        )}
      </article>
    </div>
  );
}