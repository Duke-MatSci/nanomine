function [condition]=check_phase(img,phase_cords)
        if length(size(img)) > 2
            img = img(:,:,1);
        else
            img = img;
        end
        if max(img(:))>1
            Target = double(img);
            Target = Target/256; %
            level = graythresh(Target);
            img = im2bw(Target,level);
        end
        if img(phase_cords(1),phase_cords(2))==1
            condition=1;
        else
            condition=0;
        end
end