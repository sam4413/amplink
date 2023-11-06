//AMPLink Grid Controllers
//Made by sam

const request = require('request');
require('dotenv').config();
const JSONbig = require('json-bigint');
const notify = require('../notify');
const { rejects } = require('assert');
const bearerToken = `${process.env.TORCHREMOTE_TOKEN}`;


//GridSystem v2
exports.getAllGridIds = async function() {
  try {
    const options = {
      url: `${process.env.TORCHREMOTE_ADDRESS}/api/v1/grids`,
      headers: {
        'Authorization': `Bearer ${bearerToken}`
      }
    };
    return new Promise((resolve) => {
      request.get(options, (error, response, body) => {
        if (error) {
          notify.notify(3, error)
          return;
        }

        if (response.statusCode == 401) {
          notify.notify(3, "Error accessing remote data.");
          resolve(response.statusCode);
        } else if (response.statusCode == 500) {
          notify.notify(3, `Error accessing remote data with a status code of ${response.statusCode}.`);
          resolve(response.statusCode);
        } else if (response.statusCode != 200) {
          notify.notify(3, `Error accessing remote data with a status code of ${response.statusCode}.`);
          resolve(response.statusCode);
        } else {
          resolve(body);
        }
      });
    });
  } catch (err) {
    notify.notify(3, err)
  }
}

exports.getAllGridInfo = async function(ids) {
  const batchSize = 10;
  const delayBetweenBatches = 100;
  const responses = [];

  ids = JSONbig.parse(ids);

  async function performBatchRequests(ids) {

    if (ids.length === 0) {
      notify.notify(3,`==================== Complete ====================`)
      var fixArray = responses.slice(0, -1);
      var fixArray2 = "[" + fixArray + "]";
      return Promise.resolve(fixArray2);
    }
    //console.log(ids)

    const batch = ids.slice(0, batchSize);
    ids = ids.slice(batchSize);

    if (!Array.isArray(batch)) {
      notify.notify(3,'Invalid batch:', batch);
      return Promise.reject(new Error('Invalid batch'));
    }
    const batchPromises = batch.map(id => {
      return new Promise((resolve, reject) => {
          const options = {
            url: `${process.env.TORCHREMOTE_ADDRESS}/api/v1/grids/${id}`,
            headers: {
              'Authorization': `Bearer ${bearerToken}`
            }
          };
          try {
            request.get(options, (error, response, body) => {
              if (response.statusCode != 200) {
                notify.notify(3, `Grid id ${id} no longer exists (${response.statusCode}).`);
                reject(`Grid id ${id} no longer exists (${response.statusCode}).`); //Do not include grids that do not exist anymore. Just indicate they dont exist via console.
              } else {
                responses.push(body);
                resolve(body);
              }
            });
          } catch (e) {
            notify.notify(3,e.message)
          }
          
        });
      });
    return Promise.all(batchPromises).then(() => {
      return new Promise(resolve => {
        setTimeout(() => {
          notify.notify(3,`==================== ${ids.length} / 0 ====================`)
          performBatchRequests(ids)
            .then(result => resolve(result))
            .catch(error => rejects(error));
        }, delayBetweenBatches);
      });
    });
  }
  return performBatchRequests(ids);
}
/*
// For debugging
const getAllGrids = require(__dirname + '/getAllGrids.js');

(async () => {
  const ids = await getAllGrids.getAllGridIds();
  try {
    const result = await getAllGrids.getAllGridInfo(ids);
    console.log(result); // Array of responses
  } catch (error) {
    console.error('Error:', error);
  }
})();
*/
