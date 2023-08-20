import * as express from 'express'
import * as cors from 'cors'
import {createConnection, FindOptionsWhere} from 'typeorm'
import { Request, Response } from 'express'
import { Product } from './entity/product'
import * as amqp from 'amqplib/callback_api'

createConnection().then(db => {
    const productRepository = db.getRepository(Product)

    //Connection to ampq to use rabbitmq
    amqp.connect('amqps://iuuopuiw:D6HFuOyvPZCTdTOcuNUvfQe22wUgwLfs@rat.rmq2.cloudamqp.com/iuuopuiw', (error0, connection) => {
        if (error0) {
            throw error0
        }
        //Create a channel
        connection.createChannel((error1, channel) => {
            if (error1) {
                throw error1
            }

            const app = express()

            app.use(cors({
                origin: ['http://localhost:3000']
            }))

            app.use(express.json())

            app.get('/api/products', async (req: Request, res: Response) => {
                const products = await productRepository.find()
                res.json(products)
            })

            app.post('/api/products', async (req: Request, res: Response) => {
                const product = productRepository.create(req.body)
                const result = await productRepository.save(product)
                channel.sendToQueue('product_created', Buffer.from(JSON.stringify(result)))
                return res.send(result)
            })

            app.get('/api/products/:id', async (req: Request, res: Response) => {
                // Strange workaround for findOneBy method https://github.com/typeorm/typeorm/issues/8939
                // Downgrading typeorm to 0.2.x should solve the type issue
                const product = await productRepository.findOneBy({id: req.params.id} as FindOptionsWhere<Product>)
                if (product) {
                    res.json(product)
                } else {
                    res.status(404).send('Product not found')
                }
            })

            app.put('/api/products/:id', async (req: Request, res: Response) => {
                const product = await productRepository.findOneBy({id: req.params.id} as FindOptionsWhere<Product>)
                productRepository.merge(product, req.body)
                const result = await productRepository.save(product)
                channel.sendToQueue('product_updated', Buffer.from(JSON.stringify(result)))
                return res.send(result)
            })

            app.delete('/api/products/:id', async (req: Request, res: Response) => {
                const result = await productRepository.delete({id: req.params.id} as FindOptionsWhere<Product>)
                channel.sendToQueue('product_deleted', Buffer.from(JSON.stringify({ id: req.params.id })))
                return res.json(result)
            })

            app.post('/api/products/:id/like', async (req: Request, res: Response) => {
                const product = await productRepository.findOneBy({id: req.params.id} as FindOptionsWhere<Product>)
                product.like++
                const result = await productRepository.save(product)
                return res.json(result)
            })

            console.log('listening to port 8001')
            app.listen(8001)
            process.on('beforeExit', () => {
                console.log('closing')
                connection.close()
            })
        })
    })
})

