import { useParams } from 'react-router-dom';

const PlantDetail = () => {
  const { id } = useParams();
  return (
    <div className="section active">
      <h2>Dettaglio Pianta: {id}</h2>
    </div>
  );
};
export default PlantDetail;
