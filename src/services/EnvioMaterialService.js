import { EnvioMaterial } from '../models/EnvioMaterial.js';
import { Material } from '../models/Material.js';
import { Terceirizada } from '../models/Terceirizada.js';
import { Op } from 'sequelize';

class EnvioMaterialService {
    async createEnvioMaterial(data) {
        const { idMaterial, cnpj, pesoEnviado } = data;

        // Validation 1: Check if material exists and has minimum stock
        const material = await Material.findByPk(idMaterial);
        if (!material) {
            throw new Error('Material não encontrado.');
        }
        if (material.peso < 100) {
            throw new Error(`Material com estoque insuficiente na sede. Estoque atual: ${material.peso} kg.`);
        }

        // Validation 2: Check if terceirizada exists
        const terceirizada = await Terceirizada.findByPk(cnpj);
        if (!terceirizada) {
            throw new Error('Terceirizada não encontrada.');
        }

        // Validation 3: Check if terceirizada already received material today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const existingEnvio = await EnvioMaterial.findOne({
            where: {
                cnpj: cnpj,
                createdAt: {
                    [Op.gte]: today,
                    [Op.lt]: tomorrow
                }
            }
        });

        if (existingEnvio) {
            throw new Error('Terceirizada já recebeu um envio de material hoje.');
        }

        // Validation 4: Check if peso is valid
        if (pesoEnviado <= 0) {
            throw new Error('Peso deve ser maior que zero.');
        }

        // Validation 5: Check if there's enough stock
        if (pesoEnviado > material.peso) {
            throw new Error(`Estoque insuficiente. Estoque atual: ${material.peso} kg.`);
        }

        // Create envio and update material in a transaction
        const t = await Material.sequelize.transaction();
        try {
            // Lock the material row to prevent concurrent updates
            const materialLocked = await Material.findByPk(idMaterial, {
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            const envioMaterial = await EnvioMaterial.create({
                idMaterial,
                cnpj,
                pesoEnviado
            }, { transaction: t });

            // Calculate new weight
            const newPeso = materialLocked.peso - pesoEnviado;

            // Update material's weight
            await Material.update({
                peso: newPeso
            }, {
                where: { idMaterial },
                transaction: t
            });

            console.log('✅ Material atualizado:', {
                id: idMaterial,
                nome: materialLocked.nome,
                pesoAntigo: materialLocked.peso,
                pesoNovo: newPeso,
                pesoEnviado: pesoEnviado
            });

            await t.commit();
            return envioMaterial;
        } catch (error) {
            await t.rollback();
            throw new Error('Erro ao criar envio de material: ' + error.message);
        }
    }

    async findAll() {
        try {
            const envios = await EnvioMaterial.findAll({
                include: [
                    { association: 'material' },
                    { association: 'terceirizada' }
                ]
            });
            return envios;
        } catch (error) {
            throw new Error('Erro ao buscar envios de material: ' + error.message);
        }
    }

    async findEnvioMaterialByPk(idEnvio) {
        const envioMaterial = await EnvioMaterial.findByPk(idEnvio, {
            include: [
                { association: 'material' },
                { association: 'terceirizada' }
            ]
        });
        return envioMaterial;
    }

    async delete(idEnvio) {
        const t = await Material.sequelize.transaction();
        try {
            const envio = await EnvioMaterial.findByPk(idEnvio, {
                include: [{ association: 'material' }]
            });

            if (!envio) {
                throw new Error('Envio de material não encontrado.');
            }

            // Lock the material row to prevent concurrent updates
            const materialLocked = await Material.findByPk(envio.idMaterial, {
                lock: t.LOCK.UPDATE,
                transaction: t
            });

            // Calculate new weight
            const newPeso = materialLocked.peso + envio.pesoEnviado;

            // Update material's weight
            await Material.update({
                peso: newPeso
            }, {
                where: { idMaterial: envio.idMaterial },
                transaction: t
            });

            console.log('✅ Material atualizado:', {
                id: envio.idMaterial,
                nome: materialLocked.nome,
                pesoAntigo: materialLocked.peso,
                pesoNovo: newPeso,
                pesoDevolvido: envio.pesoEnviado
            });

            // Delete the envio
            await envio.destroy({ transaction: t });

            await t.commit();
            return { message: 'Envio de material deletado com sucesso.' };
        } catch (error) {
            await t.rollback();
            throw new Error('Erro ao deletar envio de material: ' + error.message);
        }
    }

    // Add other service methods (update) as needed
}

export { EnvioMaterialService };