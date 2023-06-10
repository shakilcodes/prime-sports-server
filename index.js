const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors')
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)

app.use(cors())
app.use(express.json())


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unautorized access' });
  }
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
    if (error) {
      return res.status(401).send({ error: true, message: 'unautorized access' });
    }
    req.decoded = decoded;
    next()
  })
}


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ybsvrsr.mongodb.net/?retryWrites=true&w=majority`;



const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});
async function run() {
  try {
    const primeSportsCollection = client.db('prime-sports').collection('classes&instructor')
    const usersCollection = client.db('prime-sports').collection('users')
    const cartCollection = client.db('prime-sports').collection('cart')
    const paymentCollection = client.db('prime-sports').collection('payments')

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '2h' })
      res.send({ token })
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email }
      const user = await usersCollection.findOne(query)
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden access' });

      }
      next()
    }

    // user collections........................................................
    app.get('/users', verifyJWT, async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result)
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query)
      if (existingUser) {
        return res.send({ message: 'user all ready exists' })
      }
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result)
    })

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;

      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }

      const query = { email: email }
      const user = await usersCollection.findOne(query);
      const result = { admin: user?.role === 'instructor' }
      res.send(result)
    })






    // updated data ..................................................

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updated = {
        $set: {
          role: 'admin'
        }
      };
      const result = await usersCollection.updateOne(query, updated)
      res.send(result)
    })

    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updated = {
        $set: {
          role: 'instructor'
        }
      };
      const result = await usersCollection.updateOne(query, updated)
      res.send(result)
    })

    app.patch('/approve/admin/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updated = {
        $set: {
          status: 'Approved'
        }
      };
      const result = await primeSportsCollection.updateOne(query, updated)
      res.send(result)
    })



    // classes and instructor collections.................................
    app.get('/classesInstructor', verifyJWT, async (req, res) => {
      const result = await primeSportsCollection.find().toArray();
      res.send(result)
    })

    app.get('/classes', async (req, res) => {
      const result = await primeSportsCollection.aggregate([
        { $addFields: { numberOfStudents: { $toDouble: "$numberOfStudents" } } },
        { $sort: { numberOfStudents: -1 } }
      ]).toArray();

      res.send(result);
    });

    app.get('/singleInsructor', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(401).send({ error: true, message: 'unautorized access' });

      }

      const query = { email: email };
      const result = await primeSportsCollection.find(query).toArray();
      res.send(result)
    });



    app.post('/addAClass', async (req, res) => {
      const addClass = req.body;
      console.log(addClass)
      const result = await primeSportsCollection.insertOne(addClass)
      res.send(result)
    })

    app.post('/carts', async (req, res) => {
      const addCarts = req.body;
      const result = await cartCollection.insertOne(addCarts)
      res.send(result)
    })

    app.get('/carts/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (!email) {
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(401).send({ error: true, message: 'unautorized access' });

      }

      const query = { userEmail: email };
      const result = await cartCollection.find(query).toArray();
      res.send(result)
    });
    app.get("/singleInsructor/:email", async (req, res) => {
      const instructor = await primeSportsCollection.find({ seller_email: req.params.email, }).toArray();
      res.send(instructor);
    });


    app.delete('/carts/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await cartCollection.deleteOne(query)
      res.send(result)
    })

    app.put('/classesUpdate/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const update = req.body;
      console.log(update);
      const updated = {
        $set: {
          title: update.title,
          price: update.price,
          AvailableSeats: update.AvailableSeats,
          instrucotrName: update.instrucotrName,
          email: update.email,
          image: update.image
        }
      };
      const result = await primeSportsCollection.updateOne(query, updated, options)
      res.send(result);
    })

    // payment..................
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      if (price) {
        const amount = parseFloat(price) * 100;
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        })
        res.send({
          clientSecret: paymentIntent.client_secret
        })
      }
    })

    app.get('/payments', verifyJWT, async (req, res) => {
      const result = await paymentCollection.find().toArray();
      res.send(result)
    })

    app.get('/payments/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (!email) {
        res.send([])
      }
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(401).send({ error: true, message: 'unautorized access' });

      }

      const query = { email: email };
      const result = await paymentCollection.find(query).toArray();
      res.send(result)
    });


    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const result = await paymentCollection.insertOne(payment)
      res.send(result)
    })

   

    app.patch('/carts/updateSuccess/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const updated = {
        $set: {
          status: 'succeeded'
        }
      };
      const result = await cartCollection.updateOne(query, updated)
      res.send(result)
    })


    // FeedBack................................................
    app.put('/feedBack/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id)
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const update = req.body;
      const updated = {
        $set: {
          status: update.status,
          feedBack: update.feedBack,
         
        }
      };
      const result = await primeSportsCollection.updateOne(query, updated, options)
      res.send(result);
    })



    // app.get("/allToys/:id", async (req, res) => {
    //   const id = req.params.id
    //   const quary = { _id: new ObjectId(id) }
    //   const result = await primeSportsCollection.findOne(quary)
    //   res.send(result)
    // })



    // app.get("/searchByTitle/:text", async (req, res) => {
    //   const text = req.params.text;
    //   const result = await primeSportsCollection
    //     .find({
    //       $or: [
    //         { toy_name: { $regex: text, $options: "i" } },
    //         { sub_category: { $regex: text, $options: "i" } },
    //       ],
    //     })
    //     .toArray();
    //   res.send(result);
    // });






    // const indexKeys = { toy_name: 1, sub_category: 1 }; 
    // const indexOptions = { name: "serachByTitle" }; 
    // const result = await carCollection.createIndex(indexKeys, indexOptions);
    // console.log(result);

    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Prime sports')
})

app.listen(port, () => {
  console.log(`Prime sports listening on port ${port}`)
})