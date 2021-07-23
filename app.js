const express = require("express");
const app = express();
const port = 3005;

app.use(express.urlencoded({ extended: false }));

app.listen(port, ()=>{
  console.log(`The port is listening on ${port}`)
})
require("dotenv").config();


const env = process.env.NODE_ENV || "test";
const { DB_HOST, DB_USER, DB_PWD, DB_DB, DB_DB_TEST } = process.env;
const mysql = require("mysql2/promise");
const mysqlConfig = {
  production: {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PWD,
    database: DB_DB
  },
  test: {
    host: DB_HOST,
    user: DB_USER,
    password: DB_PWD,
    database: DB_DB_TEST
  }
};

const mysqlEnv = mysqlConfig[env];
mysqlEnv.waitForConnections = true;
mysqlEnv.connectionLimit = 20;

const pool = mysql.createPool(mysqlEnv);

const redis = require("redis");
const client = redis.createClient('6379');
function getCache (key) { 
  return new Promise((resolve, reject) => {
      client.get(key, (err, data) => {
          if (err) reject(err);
          resolve(data);
      });
  });
}


app.get("/", verifyUser, async (req,res) => {
  let {user} = req.query;
  if (!user) {
    let clientip = req.connection.remoteAddress;
    let value = await getCache(clientip);
    if (value === null) {
      let data = {
        count: 1,
        time: new Date().getTime()
      };
      client.setex(clientip, 600, JSON.stringify(data));
      let message = {
        message: `目前造訪1次`
      }
      res.status(200).send(message)
      return
    }
    let parsedValue = JSON.parse(value);
    if (parsedValue.count >= 5) {
      let time = JSON.parse(value)['time']
      let expiredTime = time + 600000;
      var clock = new Date(expiredTime);
      let message = {
          message: `請於${clock}再造訪`
      }
      res.status(429).send(message);
    } else {
      parsedValue.count += 1;
      client.set(user,JSON.stringify(parsedValue));
      let message = {
        message: `目前造訪${parsedValue.count}次`
      }
      res.status(200).send(message);
    }
  } 
  if (user !== 'admin') {
    let limitation = req.limitation
    let value = await getCache(user);
    if (value === null) {
      let data = {
        count: 1,
        time: new Date().getTime()
      };
      client.setex(user, 600, JSON.stringify(data));
      let message = {
        message: `目前造訪1次`
      }
      res.status(200).send(message)
      return
    }
    let parsedValue = JSON.parse(value);
    if (parsedValue.count >= limitation) {
      let time = JSON.parse(value)['time']
      let expiredTime = time + 600000;
      var clock = new Date(expiredTime);
      let message = {
          message: `請於${clock}再造訪`
      }
      res.status(429).send(message)
    } else {
      parsedValue.count += 1;
      client.set(user,JSON.stringify(parsedValue));
      let message = {
        message: `目前造訪${parsedValue.count}次`
      }
      res.status(200).send(message)
    }
  } else {
    return res.sendStatus(200)
  }
})

//middleware
async function verifyUser (req, res, next) {
  const {user} = req.query;
  if (user) {
    let selectResult = await pool.query('SELECT limitation FROM user_limitation WHERE user = ?', user);
    console.log(selectResult[0]);
    req.limitation = selectResult[0][0]['limitation']
  }
  next();
}