const { Client } = require('@elastic/elasticsearch');

const client = new Client({ node: 'http://localhost:9200' });

async function insert(doc, id, index) {
  await client.index({
    index,
    type: 'default',
    id,
    refresh: true,
    body: doc
  });
}
async function remove(id, index) {
  await client.delete({
    index,
    type: 'default',
    id,
    refresh: true
  });
}
module.exports.remove = remove;
module.exports.insert = insert;

async function initial() {
  await Promise.all([
    client.indices.delete({
      index: 'places'
    }),
    client.indices.delete({
      index: 'events'
    }),
    client.indices.delete({
      index: 'users'
    })
  ]).catch(_err => {});
  await Promise.all([
    client.indices.create({
      index: 'places'
    }),
    client.indices.create({
      index: 'events'
    }),
    client.indices.create({
      index: 'users'
    })
  ]);
  await Promise.all([
    client.indices.putMapping({
      index: 'places',
      type: 'default',
      body: {
        properties: {
          location: {
            type: 'geo_point'
          }
        }
      }
    }),
    client.indices.putMapping({
      index: 'events',
      type: 'default',
      body: {
        properties: {
          location: {
            type: 'geo_point'
          }
        }
      }
    })
  ]);
}
module.exports.initial = initial;
async function search(query, index) {
  const { body } = await client.search({
    index,
    body: query
  });
  return body.hits.hits;
}
module.exports.search = search;
