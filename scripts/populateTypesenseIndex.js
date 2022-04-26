require('dotenv').config();

const Typesense = require('typesense');

const searchCollection = 'products';

module.exports = (async () => {
  // Create a client
  const typesense = new Typesense.Client({
    nodes: [
      {
        host: process.env.TYPESENSE_HOST,
        port: process.env.TYPESENSE_PORT,
        protocol: process.env.TYPESENSE_PROTOCOL,
      },
    ],
    apiKey: process.env.TYPESENSE_ADMIN_API_KEY,
  });

  const schema = {
    name: searchCollection,
    fields: [
      { name: 'in_stock', type: 'bool' },
      { name: 'deleted', type: 'bool' },
      { name: 'name', type: 'string' },
      { name: 'internal_id', type: 'string' },
      { name: 'external_id', type: 'string' },
      { name: 'url', type: 'string' },
      { name: 'images', type: 'string[]' },
      { name: 'price', type: 'string' },
      { name: 'reduced_price', type: 'string', optional: true },
      { name: 'deal_price', type: 'string', optional: true },
      { name: 'brand_name', type: 'string', facet: true },
      { name: 'for_adults', type: 'bool' },
      { name: 'keywords', type: 'string[]' },
      { name: 'category', type: 'string', optional: true, facet: true },
      { name: 'sub_category', type: 'string', optional: true, facet: true },
      { name: 'description', type: 'string', optional: true },
      { name: 'colors', type: 'string[]', facet: true },
      { name: 'gender', type: 'string', optional: true },
      { name: 'sizes', type: 'string[]', facet: true },
      { name: 'rating', type: 'string', optional: true, facet: true },
      { name: 'review_count', type: 'string', optional: true },
      { name: 'language', type: 'string', optional: true },
      { name: 'vendor', type: 'string', optional: true },
      { name: 'stock_out_date', type: 'string', optional: true },
      { name: 'currency', type: 'string' },
      { name: 'vision_product_set', type: 'string' },
    ],
    // default_sorting_field: "name",
  };

  console.log('Populating index in Typesense');

  const products = require('./data/products.json');

  let reindexNeeded = false;
  try {
    const collection = await typesense.collections('products').retrieve();
    console.log('Found existing schema');
    if (
      collection.num_documents !== products.length ||
      process.env.FORCE_REINDEX === 'true'
    ) {
      console.log('Deleting existing schema');
      reindexNeeded = true;
      await typesense.collections('products').delete();
    }
  } catch (e) {
    reindexNeeded = true;
  }

  if (!reindexNeeded) {
    return true;
  }

  console.log('Creating schema: ');
  console.log(JSON.stringify(schema, null, 2));
  await typesense.collections().create(schema);

  // const collectionRetrieved = await typesense
  //   .collections("products")
  //   .retrieve();
  // console.log("Retrieving created schema: ");
  // console.log(JSON.stringify(collectionRetrieved, null, 2));

  console.log('Adding records: ');

  // Bulk Import
  // products.forEach((product) => {
  //   // product.free_shipping = product.name.length % 2 === 1; // We need this to be deterministic for tests
  //   // product.rating = (product.description.length % 5) + 1; // We need this to be deterministic for tests
  //   product.categories.forEach((category, index) => {
  //     product[`categories.lvl${index}`] = [
  //       product.categories.slice(0, index + 1).join(' > '),
  //     ];
  //   });
  // });

  try {
    const returnData = await typesense
      .collections('products')
      .documents()
      .import(products);
    console.log(returnData);
    console.log('Done indexing.');

    const failedItems = returnData.filter((item) => item.success === false);
    if (failedItems.length > 0) {
      throw new Error(
        `Error indexing items ${JSON.stringify(failedItems, null, 2)}`
      );
    }

    return returnData;
  } catch (error) {
    console.log(error);
  }
})();
