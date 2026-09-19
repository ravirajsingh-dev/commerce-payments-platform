jest.setTimeout(30000);

const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const fs = require("fs");
const path = require("path");

const Product = require("../../../models/Product");
const ProductVariant = require("../../../models/ProductVariant");
const Category = require("../../../models/Category");
const AttributeSet = require("../../../models/AttributeSet");
const { parseCatalogSearchQuery } = require("../../../modules/store/catalogFilters");
const { searchStorefrontCatalog } = require("../../../modules/store/storeService");

describe("catalog search (text query only)", () => {
  let mongoServer;
  let productSlug;

  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri(), {
      dbName: "commerce-catalog-search-tests",
    });

    const category = await Category.create({
      name: "Search",
      slug: "search-cat",
      status: 1,
    });
    const attributeSet = await AttributeSet.create({
      name: "Apparel",
      code: "apparel-search",
      status: 1,
    });
    const product = await Product.create({
      name: "Filter Saree",
      slug: "filter-saree",
      primaryCategoryId: category._id,
      categoryIds: [category._id],
      attributeSetId: attributeSet._id,
      status: 1,
    });
    productSlug = product.slug;

    await ProductVariant.create({
      productId: product._id,
      sku: "SEARCH-01",
      name: "Gold Filter",
      attributes: { color: "gold" },
      price: 1500,
      sizes: [],
      status: 1,
    });
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("parses only the q query parameter", () => {
    const parsed = parseCatalogSearchQuery({
      q: "  saree  ",
      minPrice: "1000",
      color: "gold",
    });
    expect(parsed.q).toBe("saree");
  });

  it("searches catalog by text query via API service", async () => {
    const result = await searchStorefrontCatalog({ q: "filter" });
    expect(result.ok).toBe(true);
    expect(result.items.length).toBeGreaterThanOrEqual(1);
    expect(
      result.items.some((row) => String(row.product.slug) === productSlug),
    ).toBe(true);
  });

  it("returns empty results when q is missing", async () => {
    const result = await searchStorefrontCatalog({});
    expect(result.ok).toBe(true);
    expect(result.items).toEqual([]);
    expect(result.query).toBe("");
  });

  it("mounts catalog search validators on store routes", () => {
    const routesSource = fs.readFileSync(
      path.join(__dirname, "../../../modules/store/storeRoutes.js"),
      "utf8",
    );
    expect(routesSource).toContain("catalogSearchValidators");
    expect(routesSource).toContain("searchStoreCatalog");
  });
});
