import * as THREE from 'three';
import { useEffect, useRef, useState } from 'react';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GUI } from 'lil-gui';  // Import lil-gui

const Scene = () => {
    const mountRef = useRef(null); // Reference to the mount point for the scene
    const mixersRef = useRef([]);  // Array to hold references to all animation mixers
    const actionsRef = useRef([]);  // Array to hold references to all animation actions
    const [loadingProgress, setLoadingProgress] = useState(0); // State for loading progress
    const [isPlaying, setIsPlaying] = useState(true);  // State for animation play/pause
    const objectsRef = useRef([]);  // Array to hold references to the objects

    useEffect(() => {
        // Set up the scene, camera, and renderer
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xffffff); // Set the scene background to white
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        // Create an audio listener and add it to the camera
        const listener = new THREE.AudioListener();
        camera.add(listener);

        // Create an audio object (this will be the background music)
        const audio = new THREE.Audio(listener);

        // Load the audio file (make sure to replace with your own path)
        const audioLoader = new THREE.AudioLoader();
        audioLoader.load(
            'bgm.mp3',  // Replace with your own audio file path
            (buffer) => {
                audio.setBuffer(buffer);
                audio.setLoop(true);  // Make the music loop
                audio.setVolume(0.5);  // Set the volume (0.0 to 1.0)
                audio.play();  // Start playing the audio
            },
            (xhr) => {
                // You can show loading progress for the audio file if desired
                console.log((xhr.loaded / xhr.total) * 100 + '% loaded');
            },
            (error) => {
                console.error('An error occurred while loading the audio:', error);
            }
        );

        // Create renderer and set background color
        const renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight); // Full screen size
        renderer.shadowMap.enabled = true; // Enable shadow maps
        renderer.setClearColor(new THREE.Color(0xffffff)); // Set the clear color (background) for the renderer
        mountRef.current.appendChild(renderer.domElement);

        // Add a light source
        const directionalLight = new THREE.DirectionalLight(0xffffff, 2); // Increased light intensity for brightness
        directionalLight.position.set(5, 10, 7.5); // Position the light
        directionalLight.castShadow = true; // Enable shadow casting

        // Adjust the shadow properties for better quality and coverage
        directionalLight.shadow.mapSize.width = 2048;  // Increase map size for better quality
        directionalLight.shadow.mapSize.height = 2048; // Same as above
        directionalLight.shadow.camera.near = 0.1;  // Near clipping plane for the shadow camera
        directionalLight.shadow.camera.far = 20;   // Far clipping plane for the shadow camera
        directionalLight.shadow.camera.left = -10;  // Adjust shadow camera frustum
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        directionalLight.shadow.bias = -0.005; // Adjust bias to prevent shadow artifacts
        scene.add(directionalLight);

        // Add ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0x404040); // Soft white light
        scene.add(ambientLight);

        // Create a wider platform (box) for shadows
        const boxGeo = new THREE.BoxGeometry(50, 1, 50);
        const boxMat = new THREE.MeshPhongMaterial({
            color: 0xff0000, // Corrected syntax for color property
        });
        const box = new THREE.Mesh(boxGeo, boxMat);
        box.receiveShadow = true;
        box.position.y = -2;
        scene.add(box);

        // Create a central point for the orbiting objects
        const orbitCenter = new THREE.Object3D();
        scene.add(orbitCenter);

        // Create 5 objects, one fixed and 4 orbiting
        const objects = [];
        for (let i = 0; i < 5; i++) {
            const geometry = new THREE.SphereGeometry(0.5, 16, 16);
            const material = new THREE.MeshStandardMaterial({ color: Math.random() * 0xffffff });
            const object = new THREE.Mesh(geometry, material);
            object.castShadow = true;
            object.receiveShadow = true;

            // Add the object as a child of the orbit center
            orbitCenter.add(object);
            objects.push(object);
        }

        // Store references to the objects
        objectsRef.current = objects;

        // Load the GLB models and animations
        const loadModel = (path) => {
            const loader = new GLTFLoader();
            loader.load(
                path,
                (gltf) => {
                    const model = gltf.scene;
                    
                    if(path === 'AnimatedWave.glb'){
                        model.scale.set(5, 5, 10);
                        model.position.set(0, 3.5, -10);
                        model.rotation.y = Math.PI/2;
                    }else{
                        model.scale.set(0.03, 0.03, 0.03);
                        model.position.y = 2.5;
                        model.position.z = -1;
                    }
                    const mixer = new THREE.AnimationMixer(model);
                    gltf.animations.forEach((clip) => {
                        const action = mixer.clipAction(clip);
                        action.play(); // Play animation initially
                        actionsRef.current.push(action);  // Store the action
                    });
                    mixersRef.current.push(mixer);  // Store the mixer
                    model.traverse((node) => {
                        if (node.isMesh) node.castShadow = true;
                    });
                    scene.add(model);
                    setLoadingProgress(100); // Set progress to 100% when loaded
                },
                (xhr) => {
                    if (xhr.lengthComputable) {
                        const percentComplete = (xhr.loaded / xhr.total) * 100;
                        setLoadingProgress(percentComplete);
                    }
                },
                (error) => {
                    console.error('An error occurred while loading the model:', error);
                }
            );
        };

        loadModel('drone.glb');
        loadModel('AnimatedWave.glb');

        camera.position.set(0, 7, 10); // Adjust camera position as needed

        // Create and add OrbitControls for interactive navigation
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true; // Smooth control
        controls.dampingFactor = 0.25; // Damping factor
        controls.screenSpacePanning = false; // Restrict pan to the XZ plane
        controls.target.set(0, 2.5, 0);  // Set target center for the orbit controls
        controls.maxDistance = 20; // Set max zoom-out distance
        controls.minDistance = 3;  // Set min zoom-in distance

        // Handle resizing of the window
        const onWindowResize = () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onWindowResize, false);

        // Animation loop
        const animate = () => {
            requestAnimationFrame(animate);

            // Update all mixers if available and animation is playing
            mixersRef.current.forEach((mixer) => {
                if (mixer && isPlaying) {
                    mixer.update(0.01); // Update each mixer with delta time
                }
            });

            // Rotate the orbit center and orbit the objects around it
            const time = Date.now() * 0.001;
            objectsRef.current.forEach((object, index) => {
                const angle = time + (index * Math.PI / 2); // Offset the rotation angle for each object
                const radius = 3; // Orbit radius
                object.position.x = radius * Math.cos(angle);
                object.position.z = radius * Math.sin(angle);
                object.position.y = 2.5;
            });

            controls.update(); // Update controls
            renderer.render(scene, camera);
        };
        animate();

        // Create GUI for play/pause control
        const gui = new GUI();
        const guiSettings = {
            Play: () => {
                setIsPlaying(true);  // Play the animation
                actionsRef.current.forEach(action => {
                    action.timeScale = 1;  // Set timeScale to 1 for all actions
                });
            },
            Pause: () => {
                setIsPlaying(false);  // Pause the animation
                actionsRef.current.forEach(action => {
                    action.timeScale = 0;  // Set timeScale to 0 for all actions
                });
            }
        };
        gui.add(guiSettings, 'Play');  // Add play button to the GUI
        gui.add(guiSettings, 'Pause');  // Add pause button to the GUI

        // Clean up on unmount
        return () => {
            mountRef.current.removeChild(renderer.domElement);
            renderer.dispose();
            window.removeEventListener('resize', onWindowResize);
            gui.destroy();  // Destroy the GUI to prevent memory leaks
        };
    }, []); // Dependency array ensures it runs once on mount

    return (
        <div style={{ margin: 0, padding: 0, height: '100vh', overflow: 'hidden' }}>
            <div ref={mountRef} style={{ width: '100%', height: '100%' }} />
            {loadingProgress < 100 && (
                <div
                    style={{
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        transform: 'translate(-50%, -50%)',
                        color: 'black',
                        fontSize: '24px',
                    }}
                >
                    Loading... {Math.round(loadingProgress)}%
                </div>
            )}
        </div>
    );
};

export default Scene;
