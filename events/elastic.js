const { Client } = require('@elastic/elasticsearch');

const client = new Client({ node: 'http://localhost:9200' });

async function connect() {
  try {
    await connectElastic();
    console.log('connected to Elastic');
  } catch (error) {
    console.log(error.message);
    process.exit(1);
  }
}
const connectElastic = () =>
  new Promise((resolve, reject) => {
    let count = 0;
    setInterval(function() {
      client.ping({}, { requestTimeout: 3000 }, error => {
        if (!error) {
          clearInterval(this);
          resolve();
        }
        if (count === 5) {
          reject(new Error('cannot connect to elastic'));
        }
        count += 1;
      });
    }, 1000);
  });

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
async function search(query, index) {
  const { body } = await client.search({
    index,
    body: query
  });
  return body.hits.hits;
}
module.exports.connect = connect;
module.exports.search = search;
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
