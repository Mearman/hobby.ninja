## [1.3.1](https://github.com/Mearman/hobby.ninja/compare/v1.3.0...v1.3.1) (2025-12-29)

### Bug Fixes

- **nx:** disable cache only for next:build target ([6be1732](https://github.com/Mearman/hobby.ninja/commit/6be1732f1ec37b64662e467e3a306658d57abeca))

## [1.3.0](https://github.com/Mearman/hobby.ninja/compare/v1.2.0...v1.3.0) (2025-12-29)

### Features

- **cli:** add English tag extraction to global site lookup ([276b918](https://github.com/Mearman/hobby.ninja/commit/276b91874cd5668ee60d984a6a2c015e64067671))
- **cli:** add tag extraction to bandai catalog parser ([26fb20a](https://github.com/Mearman/hobby.ninja/commit/26fb20a9fb40610d37bd2fc9ee665aae877b517b))
- **data:** add script to backfill tags from HTML files ([10cc349](https://github.com/Mearman/hobby.ninja/commit/10cc349445fc15f9eacd2c8c935a7ee2f6fca79b))
- **data:** add TagRef schema for distribution channel tags ([9b114f6](https://github.com/Mearman/hobby.ninja/commit/9b114f6082eadd8dc02cfdb884cfe448de23c72f))
- **data:** populate tags for 1478 items ([d9eda54](https://github.com/Mearman/hobby.ninja/commit/d9eda549ceede97f77b08e3d6a530cb6701a04fd))
- **nx-cloud:** setup nx cloud workspace ([d4358da](https://github.com/Mearman/hobby.ninja/commit/d4358da0ef004e58868d79f5cf5af39a387923a3))

### Bug Fixes

- **ci:** increase file descriptor limit for Nx caching ([6ad6bc6](https://github.com/Mearman/hobby.ninja/commit/6ad6bc66f36208888a68ab49cf27b924d2e97dda))
- **ci:** skip Nx cache for build to avoid EMFILE error ([c1dca14](https://github.com/Mearman/hobby.ninja/commit/c1dca14f685cf5958a7dcb0c346f7ebc79ed015f))
- **data:** clean up 01_6976.json bullet points and accessory format ([db31edf](https://github.com/Mearman/hobby.ninja/commit/db31edf17c3327c3e0982af4369ad96bceb1b737))
- **eslint:** ignore all .cjs files at any directory depth ([60b702f](https://github.com/Mearman/hobby.ninja/commit/60b702f42b2528b6a42025505164e6b35c58b437))
- **eslint:** ignore files not in TS projects and fix CLI patterns ([0a94c01](https://github.com/Mearman/hobby.ninja/commit/0a94c01ae2367c21c4f030a12b426a6fd918d93c))
- **next:** center title text vertically in FittedTitle container ([28bdec4](https://github.com/Mearman/hobby.ninja/commit/28bdec43f9f82448bf147278fb0cf6d639d74ec9))
- **next:** reduce FittedTitle padding for more text space ([210ce1e](https://github.com/Mearman/hobby.ninja/commit/210ce1e7329adcfc46fcfd44b3667895aafa51f4))
- **nx:** enable Nx Cloud remote caching ([7a65590](https://github.com/Mearman/hobby.ninja/commit/7a65590b1b55a235ef302bcfad905737ca8ae8cd))

### Refactoring

- **next:** add 15px font size for more granular title scaling ([8555d02](https://github.com/Mearman/hobby.ninja/commit/8555d0274bdb8d88d760dd20aa220a07e43f0cee))

### CI/CD

- add filter:tree:0 to checkout for faster clones ([fe46a91](https://github.com/Mearman/hobby.ninja/commit/fe46a918aed1f8a5ebefd66599f9c692b7057713))
- add nrwl/nx-set-shas for better affected detection ([8bc7679](https://github.com/Mearman/hobby.ninja/commit/8bc76790ca20a2da76cd98b6411d7bf53fa90552))
- remove --fix flag from lint step ([c12578c](https://github.com/Mearman/hobby.ninja/commit/c12578c3cb6bb141a5ee764d6fa35ff329cd8b0c))
- standardize Node.js version to 22 in build job ([119024d](https://github.com/Mearman/hobby.ninja/commit/119024dd0a3c9c08ecd590064aa2b2a6308537b3))

### Chores

- update pnpm-lock.yaml for cli data dependency ([9979112](https://github.com/Mearman/hobby.ninja/commit/997911212ee6534b0cf427a5cb2921d1c2712699))

## [1.2.0](https://github.com/Mearman/hobby.ninja/compare/v1.1.0...v1.2.0) (2025-12-28)

### Features

- **next:** add category badge to item cards ([7f9de07](https://github.com/Mearman/hobby.ninja/commit/7f9de07b5f600785972d21b2a54a1008905d0e92))

### Bug Fixes

- **data:** clean up 01_6976.json description and accessories ([8444be1](https://github.com/Mearman/hobby.ninja/commit/8444be16d81f849bb246ace6709783abe95452ae))
- **data:** remove non-existent image from characterplastic category ([7bc0346](https://github.com/Mearman/hobby.ninja/commit/7bc034651249f8dbcc3cfa5c135f5eea1e95971e))
- **data:** replace characterplastic brand with category ([7719eb9](https://github.com/Mearman/hobby.ninja/commit/7719eb9bb1229d6d84d048835014b7d966cb02e3))
- **data:** update pb brand image path to .png ([6bd3161](https://github.com/Mearman/hobby.ninja/commit/6bd316186d2613251a3a91f6cf414adedb2ce888))

### Refactoring

- **next:** improve FittedTitle height measurement ([f7171a8](https://github.com/Mearman/hobby.ninja/commit/f7171a8c3c882524c131052d9cfb5e4b45a3eb9c))
- **scripts:** apply lint fixes to all scripts ([a131159](https://github.com/Mearman/hobby.ninja/commit/a1311596ca771ac29ad96a905987c7e39d1aaa05))

### Styling

- **next:** improve entity badge text visibility ([a3aacfe](https://github.com/Mearman/hobby.ninja/commit/a3aacfecfdae93a2a093ac15a76cb0dd3e3844e8))
- **next:** reduce entity badge width to 20% ([81acb56](https://github.com/Mearman/hobby.ninja/commit/81acb56134bec7894ebffac79cbec95527993ced))

### Chores

- **data:** remove item_all category ([7219955](https://github.com/Mearman/hobby.ninja/commit/72199557fc93302645507c369dc85f6e29c56491))
- **data:** remove item_all category references from 95 items ([a14929e](https://github.com/Mearman/hobby.ninja/commit/a14929eaad52d6b63f12072699132741f77189be))
- **lint:** enable linting for scripts directory ([38fd248](https://github.com/Mearman/hobby.ninja/commit/38fd24858e14b3cd4adecc5207558ad1b7e5de74))
- remove deprecated apps/web application ([537829c](https://github.com/Mearman/hobby.ninja/commit/537829ce1a064b4a78b3f01edda3ef81fb079881))
- **scripts:** add typescript config for scripts directory ([b6b561e](https://github.com/Mearman/hobby.ninja/commit/b6b561ec5d0366c62da4854512b78c8b0cfe65e3))

## [1.1.0](https://github.com/Mearman/hobby.ninja/compare/v1.0.1...v1.1.0) (2025-12-28)

### Features

- **next:** add columns prop to CollapsibleGrid ([388c43e](https://github.com/Mearman/hobby.ninja/commit/388c43e27e2d5c83e210d406a086992293c5fe33))
- **next:** show item count below filter card instead of on hover ([f2a620c](https://github.com/Mearman/hobby.ninja/commit/f2a620c1537354e80cbcc1bc64ef9d8b976d13e4))
- **next:** show item count below filter card with theme colors ([bd0696a](https://github.com/Mearman/hobby.ninja/commit/bd0696ae35b326f8f7a0df33cc2ff456747361c2))

### Bug Fixes

- **cli:** remove unnecessary optional chaining in translate-command ([023ab70](https://github.com/Mearman/hobby.ninja/commit/023ab706c84b6632b2c3fef4d70cb10aabec6038))
- **next:** display P-Bandai sub-brands as P-Bandai on item cards ([850673f](https://github.com/Mearman/hobby.ninja/commit/850673f3e3ceb34d3353478c4af9585bcf0eb82a))
- **next:** expand grade families when selecting all grades ([27783c7](https://github.com/Mearman/hobby.ninja/commit/27783c791aeff741f56fe9e9b8e2ed649c04648b))
- **next:** fix Select none not showing for grades filter ([b35b341](https://github.com/Mearman/hobby.ninja/commit/b35b3412d0b3e10b743abdf1297d3827cd19d256))
- **next:** make columns prop responsive with maxColumns ([513cf02](https://github.com/Mearman/hobby.ninja/commit/513cf02f6b71da363c13d40ac4de6d08669b27e6))
- **next:** restore title hover overlay on filter cards ([880034a](https://github.com/Mearman/hobby.ninja/commit/880034acb1a6e0954b8618bd2222e48ff078f2f1))
- **next:** show specific child grade instead of parent on item cards ([e59723c](https://github.com/Mearman/hobby.ninja/commit/e59723ccd5b6685f9b175af29c965d9482e67899))

### Refactoring

- **cli:** use exported APIs instead of private method access ([45e06de](https://github.com/Mearman/hobby.ninja/commit/45e06deadd2c51ea51f2b6ec9722258fa7365964))
- **scrapers:** apply lint fixes to base-scraper ([89c6288](https://github.com/Mearman/hobby.ninja/commit/89c628853c93e07dcdbb789ab7846aaae433ca1c))
- **scrapers:** apply lint fixes to core scrapers ([f37105c](https://github.com/Mearman/hobby.ninja/commit/f37105c6ee783926962968848945cdebab42f930))
- **scrapers:** apply lint fixes to index managers ([28b50a9](https://github.com/Mearman/hobby.ninja/commit/28b50a9f3e10a9d061634f784dc77d63a4ddf40f))
- **scrapers:** apply lint fixes to manual-downloader ([0b70462](https://github.com/Mearman/hobby.ninja/commit/0b70462a9d087197624b8c8df19c7c730c7592d6))
- **scrapers:** apply lint fixes to manual-parser ([cac1e3d](https://github.com/Mearman/hobby.ninja/commit/cac1e3dfe4c8ace69f73087550f61d59c6bd6b5d))
- **scrapers:** apply lint fixes to url-scanner ([cb6db8a](https://github.com/Mearman/hobby.ninja/commit/cb6db8ae01742b0f249566ecce66be312fce10ca))

### Styling

- **next:** make filter sections more vertically compact ([f9bb5dd](https://github.com/Mearman/hobby.ninja/commit/f9bb5dd865d79a9333ea2e9b662f7caf0f4dce16))

### Chores

- **assets:** consolidate 30ML category images ([9e887d9](https://github.com/Mearman/hobby.ninja/commit/9e887d99baa54e7f83b845a650f16b15ad3a9642))
- **assets:** replace pb.webp with pb.png ([4545b2d](https://github.com/Mearman/hobby.ninja/commit/4545b2d1f3c5bd78ea776b4971703ff6df9f806e))
- **data:** consolidate duplicate character plastic model category ([f4e0f4f](https://github.com/Mearman/hobby.ninja/commit/f4e0f4f208f5f9302afa78c18b234dd79668df0d))
- **data:** remove duplicate 30-minutes-label category ([a4e9a17](https://github.com/Mearman/hobby.ninja/commit/a4e9a17acf2f01a9ced2b12914c9c304ce143219))
- **data:** remove empty/duplicate categories (product-list, overall-top) ([8e166c5](https://github.com/Mearman/hobby.ninja/commit/8e166c5e7067b1a3dc24368dd5f246ba520ffcf1))
- **eslint:** add scrapers package tsconfig ([6b7937a](https://github.com/Mearman/hobby.ninja/commit/6b7937a8357ffb80b9afe997926dc01fea93078a))

## [1.0.1](https://github.com/Mearman/hobby.ninja/compare/v1.0.0...v1.0.1) (2025-12-28)

### Chores

- **release:** bootstrap v1.0.0 and restore release notes in commits ([7741be2](https://github.com/Mearman/hobby.ninja/commit/7741be2b86d70e40c18a30123545d34499bfc46f))
