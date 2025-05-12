import { PedidoColetaService } from '../services/PedidoColetaService.js';

const pedidoColetaService = new PedidoColetaService();

class PedidoColetaController {
  async create(req, res) {
    try {
      const pedidoColeta = await pedidoColetaService.createPedidoColeta(req.body);
      return res.status(201).json(pedidoColeta);
    } catch (error) {
      console.error('🔥 ERRO DETALHADO:', error.message, error.stack);

      if (
        error.message.includes('Cliente não cadastrado') ||
        error.message.includes('Colaborador já solicitou')
      ) {
        return res.status(400).json({ error: error.message });
      }

      return res.status(500).json({ error: 'Erro ao criar pedido de coleta.' });
    }
  }

  async findAll(req, res) {
    try {
      const pedidosColeta = await pedidoColetaService.findAllPedidosColeta();
      return res.status(200).json(pedidosColeta);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar pedidos de coleta.' });
    }
  }

  async findByPk(req, res) {
    try {
      const { idPedido } = req.params;
      const pedidoColeta = await pedidoColetaService.findPedidoColetaByPk(idPedido);

      if (!pedidoColeta) {
        return res.status(404).json({ error: 'Pedido de coleta não encontrado.' });
      }

      return res.status(200).json(pedidoColeta);
    } catch (error) {
      return res.status(500).json({ error: 'Erro ao buscar pedido de coleta por ID.' });
    }
  }
}

export { PedidoColetaController };
