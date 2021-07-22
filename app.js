const express = require("express");
const app = express();
const port = 3005;

app.use(express.urlencoded({ extended: false }));

app.listen(port, ()=>{
  console.log(`The port is listening on ${port}`)
})

const redis = require("redis");
const client = redis.createClient('6379');
function getCache (key) { // used in async function
  return new Promise((resolve, reject) => {
      client.get(key, (err, data) => {
          if (err) reject(err);
          resolve(data);
      });
  });
}


app.get("/", async (req,res) => {
  let {user} = req.query;
  if (!user) {
    console.log('no user')
    let data = {
      count: 1,
      time: new Date().getTime()
    };
    let clientip = req.connection.remoteAddress;
    client.setex(clientip, 600, JSON.stringify(data));
    res.sendStatus(401);
    return 
  } 
  if (user !== 'admin') {
    let value = await getCache(user);
    if (value === null) {
      let data = {
        count: 1,
        time: new Date().getTime()
      };
      client.setex(user, 600, JSON.stringify(data));
      client.set(user,JSON.stringify(value));
      let message = {
        message: `目前造訪1次`
      }
      res.sendStatus(200).send(message)
      return
    }
    let count = JSON.parse(value)['count'];
    if (count > 5) {
      let time = JSON.parse(value)['time']
      let expiredTime = time + 600000;
      let remainTime = (new Date().getTime() - expiredTime)/1000;
      let message = {
          message: `請於${remainTime}再後造訪`
      }
      res.sendStatus(429).send(message)
    } else {
      count += 1;
      JSON.parse(value)['count'] = count;
      client.set(user,JSON.stringify(value));
      let message = {
        message: `目前造訪${count}次`
      }
      res.sendStatus(200).send(message)
    }
  }
})