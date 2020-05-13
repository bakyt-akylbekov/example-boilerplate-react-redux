/* eslint-disable import/no-duplicates */
import express from 'express'
import path from 'path'
import cors from 'cors'
import bodyParser from 'body-parser'
import sockjs from 'sockjs'
import axios from 'axios'

import cookieParser from 'cookie-parser'
import Html from '../client/html'

let connections = []

const port = process.env.PORT || 3000
const server = express()
const { readFile, writeFile, unlink } = require('fs').promises

server.use(cors())
// get /api/v1/users - получает всех юзеров из файла users.json, если его нет -получает данные с сервиса https://jsonplaceholder.typicode.com/users и заполняет файл users.json y и возвращает данные
// post /api/v1/users - добавляет юзера в файл users.json, с id равным id последнего элемента + 1 и возвращает {status: 'success', id: id}
// patch /api/v1/users/:userId - дополняет юзера в users.json с id равным userId и возвращает { status: 'success', id: userId }
// delete /api/v1/users/:userId - удаляет юзера в users.json с id равным userId и возвращает { status: 'success', id: userId }
// delete /api/v1/users/ - удаляет файл users.json

server.use(express.static(path.resolve(__dirname, '../dist/assets')))
server.use(bodyParser.urlencoded({ limit: '50mb', extended: true, parameterLimit: 50000 }))
server.use(bodyParser.json({ limit: '50mb', extended: true }))

server.use(cookieParser())

const wrFile = async (users) => {
  await writeFile(`${__dirname}/test.json`, JSON.stringify(users), { encoding: 'utf8' })
}

const rFile = async () => {
  return readFile(`${__dirname}/test.json`, { encoding: 'utf8' })
    .then((data) => JSON.parse(data))
    .catch(async () => {
      const { data: users } = await axios.get('https://jsonplaceholder.typicode.com/users')
      await wrFile(users)
      return users
    })
}

server.get('/api/v1/users/', async (req, res) => {
  const users = await rFile()
  res.json(users)
})
// read

server.post('/api/v1/users/', async (req, res) => {
  const newUser = req.body // со стороны клиента
  const users = await rFile()
  const newId = users[users.length - 1].id + 1
  const newUsers = [...users, { id: newId, ...newUser }]
  await wrFile(newUsers)
  res.json({ status: 'Success', id: newId })
})
// read & write

server.patch('/api/v1/users/:userId', async (req, res) => {
  const updateUser = req.body // со стороны клиента
  const { userId } = req.params
  const users = await rFile()
  const updateUsers = users.reduce((acc, rec) => {
    if (rec.id === +userId) {
      return [...acc, { ...rec, ...updateUser }]
    }
    return [...acc, rec]
  }, [])
  await wrFile(updateUsers)
  res.json({ status: 'Success', id: userId })
})
// read & write

server.delete('/api/v1/users/:userId', async (req, res) => {
  const { userId } = req.params
  const users = await rFile()
  const filteredUsers = users.filter((el) => el.id !== +userId)
  await wrFile(filteredUsers)
  res.json({ status: 'Success' })
})
// read & delete user & write

server.delete('/api/v1/users/', (req, res) => {
  unlink(`${__dirname}/test.json`)
  res.json({ status: 'Success del users' })
})
// write

// server.get('/api/v1/users/', async (req, res) => {
//   const users = await readFile(`${__dirname}/users.json`, { encoding: 'utf-8' })
//   res.json(users)
// })

// writeFile(`${__dirname}/users.json`, 'Hello first time !!!', (err) => {
//   if (err) {
//     throw err
//   }
// })

// appendFile(`${__dirname}/users.json`, '\nHello second time !!!', (err) => {
//   if (err) {
//     throw err
//   }
// })

// server.get('/api/v1/users/', async (req, res) => {
//   const { data: users } = await axios('https://jsonplaceholder.typicode.com/users') // декомпозиция / деструктуризация
//   res.json(users)
// })

// server.get('/api/v1/users/:number', async (req, res) => {
//   const { number } = req.params
//   const { data: users } = await axios('https://jsonplaceholder.typicode.com/users')
//   // const result = users.filter((item) => item.id ===  +number )
//   const result = users.slice(0, +number)
//   res.json(result)
// })

server.use('/api/', (req, res) => {
  res.status(404)
  res.end()
})

const echo = sockjs.createServer()
echo.on('connection', (conn) => {
  connections.push(conn)
  conn.on('data', async () => {})

  conn.on('close', () => {
    connections = connections.filter((c) => c.readyState !== 3)
  })
})

server.get('/', (req, res) => {
  // const body = renderToString(<Root />);
  const title = 'Server side Rendering'
  res.send(
    Html({
      body: '',
      title
    })
  )
})

server.get('/*', (req, res) => {
  const initialState = {
    location: req.url
  }

  return res.send(
    Html({
      body: '',
      initialState
    })
  )
})

const app = server.listen(port)

echo.installHandlers(app, { prefix: '/ws' })

// eslint-disable-next-line no-console
console.log(`Serving at http://localhost:${port}`)
