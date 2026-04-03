export interface IBGEState {
  id: number;
  sigla: string;
  nome: string;
}

export interface IBGECity {
  id: number;
  nome: string;
}

export const fetchStates = async (): Promise<IBGEState[]> => {
  try {
    const response = await fetch('https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome');
    if (!response.ok) throw new Error('Failed to fetch states');
    return await response.json();
  } catch (error) {
    console.error('Error fetching IBGE states:', error);
    return [];
  }
};

export const fetchCitiesByState = async (stateUf: string): Promise<IBGECity[]> => {
  if (!stateUf) return [];
  try {
    const response = await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${stateUf}/municipios?orderBy=nome`);
    if (!response.ok) throw new Error('Failed to fetch cities');
    return await response.json();
  } catch (error) {
    console.error('Error fetching IBGE cities:', error);
    return [];
  }
};
