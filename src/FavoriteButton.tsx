import { Icon } from './Icon.tsx';

export function FavoriteButton({ title, saved, onToggle }: { title: string; saved: boolean; onToggle: () => void }) {
  return <button className={`favorite-button ${saved ? 'is-favorite' : ''}`} aria-label={`${saved ? 'Remove' : 'Add'} ${title} ${saved ? 'from' : 'to'} favorites`} aria-pressed={saved} title={saved ? 'Remove from favorites' : 'Add to favorites'} onClick={onToggle}><Icon name="heart"/></button>;
}
