const { Client } = require('@elastic/elasticsearch');

const client = new Client({ node: process.env.ELASTIC_DB });

async function getUsersInCity(city, category, alreadyHave = []) {
  const q = {
    query: {
      bool: {
        should: [
          {
            bool: {
              filter: [
                {
                  match_phrase: {
                    'preferred.myCity': city
                  }
                }
              ]
            }
          },
          {
            bool: {
              filter: [
                {
                  term: {
                    'preferred.byCategory': true
                  }
                },
                {
                  term: {
                    'preferred.myCategories': category
                  }
                }
              ]
            }
          },
          {
            bool: {
              filter: {
                terms: {
                  email: alreadyHave
                }
              }
            }
          }
        ]
      }
    }
  };
  const { body } = await client.search({
    index: 'users',
    filter_path: 'hits.hits._source.email',
    body: q
  });
  const emails = [];
  body.hits.hits.forEach(element => {
    emails.push(element._source.email);
  });
  return emails;
}
module.exports.getUsersInCity = getUsersInCity;
