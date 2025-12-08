import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'hobby.ninja - Static Database',
  description: 'Static HTML pages for hobby.ninja graph database',
};

export default function HomePage() {
  return (
    <div>
      <header>
        <h1>hobby.ninja</h1>
        <p>Static HTML Generation for Graph Database</p>
      </header>

      <main>
        <section>
          <h2>Database Navigation</h2>
          <nav>
            <ul>
              <li><a href="/database/gunpla/">Gunpla Database</a></li>
              <li><a href="/database/brands/">Brands</a></li>
              <li><a href="/database/categories/">Categories</a></li>
              <li><a href="/database/series/">Series</a></li>
              <li><a href="/database/manuals/">Manuals</a></li>
            </ul>
          </nav>
        </section>

        <section>
          <h2>Collection Management</h2>
          <nav>
            <ul>
              <li><a href="/collection/gunpla/">My Gunpla Collection</a></li>
              <li><a href="/collection/wishlist/">Wishlist</a></li>
              <li><a href="/collection/progress/">Build Progress</a></li>
            </ul>
          </nav>
        </section>

        <section>
          <h2>Search & Discovery</h2>
          <nav>
            <ul>
              <li><a href="/search/">Advanced Search</a></li>
              <li><a href="/browse/">Browse by Category</a></li>
            </ul>
          </nav>
        </section>
      </main>

      <footer>
        <p>&copy; 2025 hobby.ninja - Static HTML Generation</p>
      </footer>
    </div>
  );
}