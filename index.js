const express = require('express')
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const cors = require('cors')
const jwt = require('jsonwebtoken');
const app = express()
const port = process.env.PORT || 5000;

app.use(cors())
app.use(express.json())

const verifyJWT = (req, res, next) => {
const authorization = req.headers.authorization;
if(!authorization){
  return res.status(401).send({error: true, message: 'unautorized access'});
}
const token = authorization.split(' ')[1];
jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
  if(error){
    return res.status(401).send({error: true, message: 'unautorized access'});
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

    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN, { expiresIn: '2h' })
      res.send({ token })
    })


    // user collections
    app.get('/users', async (req, res) => {
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

    // classes and instructor collections
    app.get('/classesInstructor', async (req, res) => {
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

    app.get('/singleInsructor', verifyJWT, async(req, res)=>{
      const email = req.query.email;
      console.log(email)
      if(!email){
        res.send([])
      }

      const decodedEmail = req.decoded.email;
      if(email !== decodedEmail){
        return res.status(401).send({error: true, message: 'unautorized access'});

      }

      const query = {email: email};
      const result = await primeSportsCollection.find(query).toArray();
      res.send(result)
    });

    // app.get("/singleInsructor/:email", async (req, res) => {
    //   const toys = await primeSportsCollection.find({ seller_email: req.params.email, }).toArray();
    //   res.send(toys);
    // });

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




    // app.delete('/allToys/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: new ObjectId(id) }
    //   const result = await primeSportsCollection.deleteOne(query)
    //   res.send(result)
    // })

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