import express from 'express'
import { Server } from 'socket.io'
import handlebars from 'express-handlebars'
import productsRouter from './routers/products.router.js'
import cartsRouter from './routers/carts.router.js'
import viewsRouter from './routers/views.router.js'
import chatRouter from './routers/chat.router.js'
import sessionsRouter from './routers/sessions.router.js'
import viewsUserRouter from './routers/viewsUser.router.js'
import mailPurchaseRouter from './routers/mailPurchase.router.js'
import mockingRouter from './routers/mocking.router.js'
import loggerTestRouter from './routers/logger.router.js'
import mongoose from 'mongoose'
import Message from './models/message.model.js'
import session from 'express-session'
import MongoStore from 'connect-mongo'
import passport from 'passport'
import initializePassport from './config/passport.config.js'
import config from './config/config.js'
import errorHandler from './middlewares/error.middleware.js'
import logger from './logger.js'

const port = config.port
const mongoURL = config.mongoURL
const mongoDBName = config.mongoDBName

// crea una instancia de una aplicación de express
const app = express(); 

// middleware para parsear el body de las requests a JSON
app.use(express.json()); 

app.use(errorHandler)
 // middleware para servir archivos estáticos
app.use(express.static('./src/public'));

// configuracion de la sesion
app.use(session({
  store: MongoStore.create({
    mongoUrl: mongoURL,
    dbName: mongoDBName,
    mongoOptions: {
      useNewUrlParser: true,
      useUnifiedTopology: true
    }
  }),
  secret: 'secret',
  resave: true,
  saveUninitialized: true
}))

// configuracion de passport
initializePassport();
app.use(passport.initialize());
app.use(passport.session());

// configuracion del motor de plantillas handlebars
app.engine('handlebars', handlebars.engine());
app.set('views', './src/views');
app.set('view engine', 'handlebars');


// Inicialización del servidor
try {
  // conecta con la base de datos
  await mongoose.connect(mongoURL) 
  // levanta el servidor en el puerto especificado  
  const serverHttp = app.listen(port, () => logger.info('server up')) 
  // instancia de socket.io
  const io = new Server(serverHttp) 

  app.use((req, res, next) => {
    req.io = io;
    next();
  }); // middleware para agregar la instancia de socket.io a la request

  // Rutas
  app.get('/', (req, res) => {
    if (req.session.user) {
      // Si el usuario ya está autenticado, redireccionar a la vista de productos
      res.render('index');
    } else {
      // Si el usuario no ha iniciado sesión, redireccionar a la vista de inicio de sesión
      res.redirect('/login');
    }
  })

   // registra el router de usuario en la ruta /
  app.use('/', viewsUserRouter);
  // ruta para renderizar la vista de chat
  app.use('/chat', chatRouter); 
  // ruta para renderizar la vista de productos
  app.use('/products', viewsRouter); 
  // ruta para generar productos aleatorios con Faker
  app.use('/mockingproducts', mockingRouter); 
   // registra el router de productos en la ruta /api/products
  app.use('/api/products', productsRouter);
   // registra el router de carritos en la ruta /api/carts
  app.use('/api/carts', cartsRouter);
   // registra el router de sesiones en la ruta /api/sessions
  app.use('/api/sessions', sessionsRouter);
  // ruta utilizada para enviar el detalle de la compra
  app.use('/sendMailPurchase', mailPurchaseRouter); 
   // ruta utilizada para probar el log
  app.use('/loggerTest', loggerTestRouter);
  
  io.on('connection', socket => {
    logger.info('Nuevo cliente conectado!')

    socket.broadcast.emit('Alerta');

    // Cargar los mensajes almacenados en la base de datos
    Message.find()
      .then(messages => {
        socket.emit('messages', messages);
      })
      .catch(error => {
        logger.error(error.message);
      });

    socket.on('message', data => {
      
      // Guardar el mensaje en la base de datos
      const newMessage = new Message({
        user: data.user,
        message: data.message
      });

      newMessage.save()
        .then(() => {
          
          // Emitir el evento messages con los mensajes actualizados de la base de datos
          Message.find()
            .then(messages => {
              io.emit('messages', messages);
            })
            .catch(error => {
              logger.error(error.message);
            });
        })
        .catch(error => {
          logger.error(error.message);
        });
    });

    socket.on('productList', async (data) => {
      // emite el evento updatedProducts con la lista de productos
      io.emit('updatedProducts', data) 
    }) // evento que se ejecuta cuando se actualiza la lista de productos
  }) // evento que se ejecuta cuando un cliente se conecta
} catch (error) {
  logger.error(error.message)
}
