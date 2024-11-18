// pages/index.tsx
import Canvas from '../../components/CanvasNew';

const Home: React.FC = () => {
    return (
        <div>
            <h1 className='text-center p-4'>Canvas Editor</h1>
            <Canvas />
        </div>
    );
};

export default Home;