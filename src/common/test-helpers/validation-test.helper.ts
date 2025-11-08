import { BadRequestException } from '@nestjs/common';
import { IdValidationPipe } from '../pipes/id-validation/id-validation.pipe';

/**
 * Helper function para probar validación de ID inválido
 * @param id - El ID a validar
 * @param expectedMessage - Mensaje de error esperado (opcional, por defecto "Invalid ID")
 */
export const testInvalidIdValidation = async (
    id: any, 
    expectedMessage: string = "Invalid ID"
) => {
    const idValidationPipe = new IdValidationPipe();
    
    // Act & Assert - Probar el pipe directamente
    await expect(idValidationPipe.transform(id, { type: 'param', data: 'id' })).rejects.toThrow(BadRequestException);
    
    // Verificar el mensaje específico
    try {
        await idValidationPipe.transform(id, { type: 'param', data: 'id' });
    } catch (error) {
        expect(error.response.message).toBe(expectedMessage);
    }
};

/**
 * Helper function para probar que un servicio NO fue llamado cuando la validación falla
 * @param service - El servicio mock
 * @param methodName - Nombre del método del servicio
 */
export const expectServiceNotCalled = (service: any, methodName: string) => {
    expect(service[methodName]).not.toHaveBeenCalled();
};

/**
 * Helper function para probar validación de ID con verificación de servicio
 * @param id - El ID a validar
 * @param service - El servicio mock
 * @param methodName - Nombre del método del servicio
 * @param expectedMessage - Mensaje de error esperado (opcional)
 */
export const testInvalidIdWithServiceValidation = async (
    id: any,
    service: any,
    methodName: string,
    expectedMessage: string = "Invalid ID"
) => {
    // Probar validación del pipe
    await testInvalidIdValidation(id, expectedMessage);
    
    // Verificar que el servicio NO fue llamado
    expectServiceNotCalled(service, methodName);
};
