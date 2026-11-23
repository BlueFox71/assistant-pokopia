import { useMemo, useState } from 'react'
import { Modal } from 'antd'
import PlanDeVille, { plansAvec } from './PlanDeVille'
import { usePlans } from '../utils/plansStorage'
import { useHabitats } from '../utils/habitatsStorage'
import { frPokemon } from '../data'

/**
 * « Plan » — ou « Plans » s'il y en a plusieurs — : les plans personnalisés où l'un de ces
 * Pokémon est prévu, ouverts sur son habitat qui brille. Rien du tout s'il n'est dans aucun.
 *
 * @param {{ pokemon: string[], className?: string }} props
 */
export default function BoutonPlans({ pokemon, className = 'ghost-btn' }) {
  const tous = usePlans()
  const mesHabitats = useHabitats()
  const [ouvert, setOuvert] = useState(false)
  const cle = pokemon.join(',')
  const plans = useMemo(() => plansAvec(tous, pokemon), [tous, cle])
  if (!plans.length) return null

  const libelle = plans.length > 1 ? 'Plans' : 'Plan'
  const qui = pokemon.length === 1 ? frPokemon(pokemon[0]) : 'ce groupe'
  return (
    <>
      <button
        type="button"
        className={className}
        title={`Les plans personnalisés où ${qui} est prévu : ${plans.map((p) => p.nom).join(', ')}`}
        onClick={() => setOuvert(true)}
      >
        {libelle}
      </button>
      <Modal
        title={plans.length > 1 ? `Plans — ${qui}` : `Plan — ${plans[0].nom}`}
        open={ouvert}
        onCancel={() => setOuvert(false)}
        footer={null}
        width={1200}
        destroyOnClose
      >
        <PlanDeVille plans={plans} mesHabitats={mesHabitats} enAvant={pokemon} />
      </Modal>
    </>
  )
}
