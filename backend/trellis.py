import replicate
from typing import Optional, List
from typing_extensions import TypedDict
from config import settings
import logging

logger = logging.getLogger(__name__)

class TrellisOutput(TypedDict, total=False):
    """Output schema from Trellis model."""
    model_file: str
    color_video: str
    gaussian_ply: str
    normal_video: str
    combined_video: str
    no_background_images: List[str]

class TrellisService:
    def __init__(self):
        self.model = "firtoz/trellis:e8f6c45206993f297372f5436b90350817bd9b4a0d52d2a76df50c1c8afa2b3c"
        self.api_token = settings.REPLICATE_API_KEY
        if self.api_token:
            # Log first 10 chars for debugging (never log full API keys in production!)
            logger.info(f"Replicate API key configured: {self.api_token[:10]}...")
        else:
            logger.warning("No Replicate API key found in settings")
    
    def generate_3d_asset(
        self,
        images: List[str],
        seed: int = 1337,
        randomize_seed: bool = False,
        texture_size: int = 2048,
        mesh_simplify: float = 0.96,
        generate_color: bool = True,
        generate_normal: bool = False,
        generate_model: bool = True,
        save_gaussian_ply: bool = False,
        return_no_background: bool = True,
        ss_sampling_steps: int = 26,
        ss_guidance_strength: float = 8.0,
        slat_sampling_steps: int = 26,
        slat_guidance_strength: float = 3.2
    ) -> TrellisOutput:
        """
        Generate a 3D asset from input images using Trellis.
        """
        try:
            # Log API key status
            logger.info(f"REPLICATE_API_KEY from settings: {settings.REPLICATE_API_KEY[:10] if settings.REPLICATE_API_KEY else 'NOT SET'}...")
            logger.info(f"self.api_token: {self.api_token[:10] if self.api_token else 'NOT SET'}...")
            
            logger.info("-" * 80)
            logger.info("TRELLIS SERVICE - Preparing input data:")
            
            input_data = {
                "images": images,
                "seed": seed,
                "randomize_seed": randomize_seed,
                "texture_size": texture_size,
                "mesh_simplify": mesh_simplify,
                "generate_color": generate_color,
                "generate_normal": generate_normal,
                "generate_model": generate_model,
                "save_gaussian_ply": save_gaussian_ply,
                "return_no_background": return_no_background,
                "ss_sampling_steps": ss_sampling_steps,
                "ss_guidance_strength": ss_guidance_strength,
                "slat_sampling_steps": slat_sampling_steps,
                "slat_guidance_strength": slat_guidance_strength
            }
            
            # Log all input parameters
            for key, value in input_data.items():
                if key == "images":
                    # Log only the count and first 100 chars of each image
                    if isinstance(value, list):
                        img_info = f"[{len(value)} image(s)]"
                        if len(value) > 0:
                            first_img = str(value[0])
                            img_info += f" First: {first_img[:100]}..."
                        logger.info(f"  {key}: {img_info}")
                    else:
                        logger.info(f"  {key}: [invalid format]")
                else:
                    logger.info(f"  {key}: {value}")
            logger.info("-" * 80)
            
            # Create a client with the API token explicitly set
            client = replicate.Client(api_token=self.api_token)
            output = client.run(self.model, input=input_data)
            
            # Convert FileOutput objects to strings (URLs)
            # Only include non-None values in the result
            result = {}
            for key, value in output.items():
                if value is not None:
                    if isinstance(value, list):
                        # Only include list if it has items
                        converted_list = [str(item) for item in value if item is not None]
                        if converted_list:
                            result[key] = converted_list
                    else:
                        result[key] = str(value)
            
            logger.info(f"Successfully generated 3D asset: {result}")
            return result
        except Exception as e:
            raise Exception(f"Failed to generate 3D asset: {str(e)}")

trellis_service = TrellisService()

