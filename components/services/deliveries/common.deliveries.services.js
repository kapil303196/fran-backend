import Deliveries from '@/models/Deliveries.model';

const find = async (req) => {
  // some vars
  let query = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 }

  // if date provided, filter by date
  if (req.body.when) {
    query['when'] = {
      '$gte': req.body.when
    }
  };

  let totalResults = await Deliveries.find(query).countDocuments();

  if (totalResults < 1) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find any delivery`
      }
    }
  }

  let deliveries = await Deliveries.find(query).skip(skip).sort(sort).limit(limit);

  return {
    totalResults: totalResults,
    deliveries
  }
}

const filter = async (req) => {
  // some vars
  let query = {};
  let query1 = {};
  let limit = req.body.limit ? (req.body.limit > 100 ? 100 : parseInt(req.body.limit)) : 100;
  let skip = req.body.page ? ((Math.max(0, parseInt(req.body.page)) - 1) * limit) : 0;
  let sort = { _id: 1 }

  if (req.body.dateFrom && req.body.dateTo) {
    query['when'] = {
      '$gte': req.body.dateFrom,
      '$lt': req.body.dateTo,
    };
  }

  // if date provided, filter by date
  if (req.body.when) {
    query['when'] = {
      '$gte': req.body.when
    };
  }

  // let totalResults = await Deliveries.find(query).countDocuments();

  // if (totalResults < 1) {
  //   throw {
  //     code: 404,
  //     data: {
  //       message: 'We couldn\'t find any delivery'
  //     }
  //   };
  // }

  // let deliveries = await Deliveries.find(query).populate({
  //   path: 'products',
  //   match: { 'weight': { '$gte': req.body.weight || 0 } }
  // }).skip(skip).sort(sort).limit(limit);

  // return {
  //   totalResults: totalResults,
  //   deliveries
  // };


  const post = await Deliveries.aggregate([
    {
      $match: {
        'when': {
          '$gte': new Date(req.body.dateFrom),
          '$lt': new Date(req.body.dateTo)
        }
      }
    },
    {
      $lookup: {
        from: 'products', localField: 'products', foreignField: '_id', as: 'products',
      },
    },
    {
      $match: {
        'products.weight': {
          $gte: parseInt(req.body.weight)
        }
      }
    },
    {
      $facet: {
        metadata: [{
          $group: {
            _id: null,
            count: { $sum: 1 },
          },
        }],
        data: [
          { $sort: sort },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              products: {
                $filter: {
                  input: '$products',
                  as: 'product',
                  cond: {
                    $gte: ["$$product.weight", parseInt(req.body.weight)]
                  },
                },
              },
              origin: '$origin',
              destination: '$destination',
              when: '$when',
              __v: '$__v',
            }
          },
        ],
      },
    },
    {
      $project: {
        data: 1,
        // Get total from the first element of the metadata array
        count: { $arrayElemAt: ['$metadata.count', 0] },
      },


    }
  ]).allowDiskUse(true).exec()

  let newPost = post[0] || {};
  return {
    totalResults: newPost.count, deliveries: newPost.data
  }
}

const create = async (req) => {
  try {
    await Deliveries.create(req.body);
  } catch (e) {
    throw {
      code: 400,
      data: {
        message: `An error has occurred trying to create the delivery:
          ${JSON.stringify(e, null, 2)}`
      }
    }
  }
}

const findOne = async (req) => {
  let delivery = await Deliveries.findOne({ _id: req.body.id });
  if (!delivery) {
    throw {
      code: 404,
      data: {
        message: `We couldn't find a delivery with the sent ID`
      }
    }
  }
  return delivery;
}

export default {
  find,
  create,
  findOne,
  filter
}
